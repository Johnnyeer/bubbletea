import { useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

const formatCurrency = value => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) {
        return "$0.00";
    }
    return `$${amount.toFixed(2)}`;
};

const normalizeCategory = raw => (raw || "").toString().toLowerCase();

const isNoneOption = itemName => /^no\s+/i.test((itemName || "").toString());

const NONE_MILK_OPTION = {
    id: "__none_milk__",
    name: "No Milk",
    category: "milk",
    price: 0,
    quantity: 0,
    is_active: true,
};

const getDisplayLabel = item => {
    if (!item) {
        return "";
    }
    const category = normalizeCategory(item.category);
    const name = item.name || "";

    if (category === "tea") {
        return name.replace(/\s*tea$/i, "") || name;
    }
    if (category === "milk" || category === "addon") {
        return isNoneOption(name) ? "None" : name;
    }
    return name;
};

const listStyle = {
    listStyle: "disc",
    paddingLeft: 20,
    margin: "8px 0",
    display: "grid",
    gap: 6,
};

const listItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
};

export default function MenuSelectionPage({ system, navigate, onAddToCart }) {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedTeaId, setSelectedTeaId] = useState(null);
    const [selectedMilkId, setSelectedMilkId] = useState(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState([]);

    const updateStatusMessage = typeof system?.onStatusMessage === "function" ? system.onStatusMessage : null;

    useEffect(() => {
        setIsLoading(true);
        setError("");
        fetch("/api/items")
            .then(async response => {
                const data = await response.json().catch(() => []);
                if (!response.ok) {
                    throw new Error(data.error || "Unable to load menu");
                }
                return Array.isArray(data) ? data : [];
            })
            .then(collection => {
                setItems(collection);
                if (collection.length === 0 && updateStatusMessage) {
                    updateStatusMessage("No menu items available.");
                }
            })
            .catch(err => {
                const message = err.message || "Unable to load menu";
                setError(message);
                if (updateStatusMessage) {
                    updateStatusMessage(message);
                }
            })
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeItems = useMemo(() => items.filter(item => item && item.is_active !== false), [items]);

    const groupedItems = useMemo(() => {
        const groups = { tea: [], milk: [], addon: [], other: [] };
        for (const item of activeItems) {
            const key = normalizeCategory(item.category);
            if (key in groups) {
                groups[key].push(item);
            } else {
                groups.other.push(item);
            }
        }
        return groups;
    }, [activeItems]);

    const teaOptions = groupedItems.tea;
    const rawMilkOptions = groupedItems.milk;
    const milkOptions = useMemo(() => {
        const options = rawMilkOptions || [];
        if (options.some(option => isNoneOption(option.name))) {
            return options;
        }
        return [NONE_MILK_OPTION, ...options];
    }, [rawMilkOptions]);
    const addonOptions = groupedItems.addon.filter(option => !isNoneOption(option.name));
    const noneAddonOption = groupedItems.addon.find(option => isNoneOption(option.name));

    useEffect(() => {
        if (selectedTeaId && teaOptions.some(option => option.id === selectedTeaId)) {
            return;
        }
        const defaultTea = teaOptions[0];
        if (defaultTea) {
            setSelectedTeaId(defaultTea.id);
        }
    }, [teaOptions, selectedTeaId]);

    useEffect(() => {
        if (milkOptions.length === 0) {
            setSelectedMilkId(null);
            return;
        }
        if (selectedMilkId && milkOptions.some(option => option.id === selectedMilkId)) {
            return;
        }
        const preferred = milkOptions.find(option => isNoneOption(option.name)) || milkOptions[0];
        setSelectedMilkId(preferred ? preferred.id : null);
    }, [milkOptions, selectedMilkId]);

    useEffect(() => {
        setSelectedAddonIds(previous => {
            const validIds = previous.filter(id => addonOptions.some(option => option.id === id));
            return validIds.length === previous.length ? previous : validIds;
        });
    }, [addonOptions]);

    const itemsById = useMemo(() => {
        const map = new Map();
        for (const item of activeItems) {
            map.set(item.id, item);
        }
        for (const option of milkOptions) {
            if (!map.has(option.id)) {
                map.set(option.id, option);
            }
        }
        return map;
    }, [activeItems, milkOptions]);

    const selectedTea = itemsById.get(selectedTeaId) || null;
    const selectedMilk = itemsById.get(selectedMilkId) || null;
    const selectedAddons = useMemo(
        () => selectedAddonIds.map(id => itemsById.get(id)).filter(Boolean),
        [itemsById, selectedAddonIds],
    );

    const totalCost = useMemo(() => {
        const base = Number(selectedTea?.price || 0);
        const milk = Number(selectedMilk?.price || 0);
        const addons = selectedAddons.reduce((sum, item) => sum + Number(item?.price || 0), 0);
        return base + milk + addons;
    }, [selectedTea, selectedMilk, selectedAddons]);

    const handleAddonToggle = id => {
        setSelectedAddonIds(previous => {
            if (previous.includes(id)) {
                return previous.filter(entry => entry !== id);
            }
            return [...previous, id];
        });
    };

    const handleClearAddons = () => {
        setSelectedAddonIds([]);
    };

    const handleAdd = () => {
        if (!selectedTea) {
            return;
        }
        const teaLabel = getDisplayLabel(selectedTea);
        const milkLabel = selectedMilk ? getDisplayLabel(selectedMilk) : "None";
        const addonLabels = selectedAddons.map(getDisplayLabel).filter(Boolean);

        let displayName = teaLabel ? `${teaLabel} Tea` : "Bubble Tea";
        if (milkLabel && milkLabel !== "None") {
            displayName += ` with ${milkLabel}`;
        }
        if (addonLabels.length > 0) {
            displayName += ` + ${addonLabels.join(", ")}`;
        }

        const inventoryItemIds = [];
        const addInventoryItemId = item => {
            const candidateId = item?.id;
            if (Number.isInteger(candidateId)) {
                inventoryItemIds.push(candidateId);
            }
        };

        addInventoryItemId(selectedMilk);
        selectedAddons.forEach(addInventoryItemId);

        const payload = {
            menu_item_id: selectedTea.id,
            name: displayName,
            price: Number(totalCost.toFixed(2)),
            quantity: 1,
            options: {
                tea: teaLabel || null,
                milk: milkLabel,
                addons: addonLabels,
            },
        };

        if (inventoryItemIds.length > 0) {
            payload.inventory_item_ids = inventoryItemIds;
        }

        if (typeof onAddToCart === "function") {
            onAddToCart(payload);
        }
    };
    const canSubmit = Boolean(selectedTea) && !isLoading && !error;

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Order Menu</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#4a5568" }}>Customize your drink and add it to the cart.</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => navigate("/order")} style={secondaryButtonStyle}>Back</button>
                        <button type="button" onClick={() => navigate("/cart")} style={primaryButtonStyle}>Go to Cart</button>
                    </div>
                </div>

                {isLoading && <p>Loading order menu...</p>}
                {error && (
                    <div style={{ border: "1px solid #fca5a5", background: "#fee2e2", borderRadius: 8, padding: 12, color: "#991b1b" }}>
                        {error}
                    </div>
                )}

                {!isLoading && !error && (
                    <div style={{ display: "grid", gap: 18 }}>
                        <div>
                            <h3 style={{ margin: "0 0 4px 0" }}>Tea Type:</h3>
                            {teaOptions.length === 0 ? (
                                <p style={{ margin: 0 }}>No tea bases available.</p>
                            ) : (
                                <ul style={listStyle}>
                                    {teaOptions.map(option => (
                                        <li key={option.id}>
                                            <label style={listItemStyle}>
                                                <input
                                                    type="radio"
                                                    name="tea-selection"
                                                    value={option.id}
                                                    checked={selectedTeaId === option.id}
                                                    onChange={() => setSelectedTeaId(option.id)}
                                                />
                                                <span>
                                                    {getDisplayLabel(option)} {formatCurrency(option.price)}
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <h3 style={{ margin: "0 0 4px 0" }}>With Milk:</h3>
                            {milkOptions.length === 0 ? (
                                <p style={{ margin: 0 }}>No milk options available.</p>
                            ) : (
                                <ul style={listStyle}>
                                    {milkOptions.map(option => (
                                        <li key={option.id}>
                                            <label style={listItemStyle}>
                                                <input
                                                    type="radio"
                                                    name="milk-selection"
                                                    value={option.id}
                                                    checked={selectedMilkId === option.id}
                                                    onChange={() => setSelectedMilkId(option.id)}
                                                />
                                                <span>
                                                    {getDisplayLabel(option)} {formatCurrency(option.price)}
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <h3 style={{ margin: "0 0 4px 0" }}>Add-on(s):</h3>
                            {addonOptions.length === 0 && !noneAddonOption ? (
                                <p style={{ margin: 0 }}>No add-ons available.</p>
                            ) : (
                                <ul style={listStyle}>
                                    {addonOptions.map(option => (
                                        <li key={option.id}>
                                            <label style={listItemStyle}>
                                                <input
                                                    type="checkbox"
                                                    value={option.id}
                                                    checked={selectedAddonIds.includes(option.id)}
                                                    onChange={() => handleAddonToggle(option.id)}
                                                />
                                                <span>
                                                    {getDisplayLabel(option)} {formatCurrency(option.price)}
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                    <li key="addon-none">
                                        <label style={listItemStyle}>
                                            <input
                                                type="checkbox"
                                                checked={selectedAddonIds.length === 0}
                                                onChange={handleClearAddons}
                                            />
                                            <span>
                                                {noneAddonOption ? getDisplayLabel(noneAddonOption) : "None"} {formatCurrency(noneAddonOption?.price || 0)}
                                            </span>
                                        </label>
                                    </li>
                                </ul>
                            )}
                        </div>

                        <div style={{ fontWeight: 700 }}>
                            Total Cost: {formatCurrency(totalCost)}
                        </div>

                        <div>
                            <button
                                type="button"
                                style={{ ...primaryButtonStyle, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? "pointer" : "not-allowed" }}
                                onClick={handleAdd}
                                disabled={!canSubmit}
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </SystemLayout>
    );
}


