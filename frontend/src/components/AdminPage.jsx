import { useCallback, useEffect, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { primaryButtonStyle, secondaryButtonStyle, labelStyle, inputStyle, cardStyle } from "./styles.js";

const EMPTY_ACCOUNT = { full_name: "", username: "", password: "", role: "staff" };
const DEFAULT_ADJUSTMENT = "1";
const tableWrapperStyle = { overflowX: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 12 };
const headerCellStyle = { textAlign: "left", padding: "8px 4px", borderBottom: "1px solid #d0d0d0" };
const cellStyle = { padding: "8px 4px", borderBottom: "1px solid #e5e7eb", verticalAlign: "top" };
const errorTextStyle = { color: "#b91c1c", fontWeight: "bold", marginTop: 8 };
const helperTextStyle = { fontSize: "0.9rem", color: "#475569" };

const EMPTY_ITEM = { name: "", category: "", price: "", quantity: "0" };
const successTextStyle = { color: "#15803d", fontWeight: "bold", marginTop: 8 };

const formatCurrency = value => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) {
        return "$0.00";
    }
    return `$${amount.toFixed(2)}`;
};

export default function AdminPage({
    system,
    session,
    loginForm,
    onLoginChange,
    onLoginSubmit,
    onLogout,
    isAuthenticated,
    user,
    navigate,
    onCreateTeamAccount,
}) {
    const [newAccount, setNewAccount] = useState(EMPTY_ACCOUNT);
    const [isSavingAccount, setIsSavingAccount] = useState(false);
    const [accountMessage, setAccountMessage] = useState("");
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [inventoryError, setInventoryError] = useState("");
    const [quantityInputs, setQuantityInputs] = useState({});
    const [pendingItemId, setPendingItemId] = useState(null);
    const [newItem, setNewItem] = useState(EMPTY_ITEM);
    const [isSavingItem, setIsSavingItem] = useState(false);
    const [newItemError, setNewItemError] = useState("");
    const [newItemMessage, setNewItemMessage] = useState("");

    const userRole = typeof user?.role === "string" ? user.role.toLowerCase() : "";
    const isManager = Boolean(isAuthenticated && userRole === "manager");
    const canViewInventory = Boolean(isAuthenticated && (userRole === "staff" || userRole === "manager"));
    const isInventoryView = system?.currentPath === "/admin";
    const shouldShowInventory = Boolean(canViewInventory && isInventoryView);
    const canManageInventory = isManager;
    const authToken = session?.token || "";

    const updateStatusMessage = typeof system?.onStatusMessage === "function" ? system.onStatusMessage : null;

    const getAdjustmentValue = itemId => {
        const raw = quantityInputs[itemId];
        return raw === undefined ? DEFAULT_ADJUSTMENT : raw;
    };

    const handleFieldChange = event => {
        const { name, value } = event.target;
        setNewAccount(previous => ({ ...previous, [name]: value }));
    };

    const handleNewItemFieldChange = event => {
        const { name, value } = event.target;
        setNewItem(previous => ({ ...previous, [name]: value }));
    };

    const handleCreateAccount = async event => {
        event.preventDefault();
        if (!onCreateTeamAccount) {
            return;
        }
        setIsSavingAccount(true);
        setAccountMessage("");
        try {
            const payload = {
                full_name: newAccount.full_name.trim(),
                username: newAccount.username.trim(),
                password: newAccount.password,
                role: newAccount.role,
            };
            const result = await onCreateTeamAccount(payload);
            setAccountMessage(`Created account for ${result.full_name}.`);
            setNewAccount(EMPTY_ACCOUNT);
        } catch (error) {
            setAccountMessage(error.message || "Unable to create account");
        } finally {
            setIsSavingAccount(false);
        }
    };

    const goToPath = path => event => {
        event.preventDefault();
        if (typeof navigate === "function") {
            navigate(path);
        }
    };

    const loadInventory = useCallback(() => {
        if (!shouldShowInventory) {
            return;
        }
        setIsLoadingInventory(true);
        setInventoryError("");
        const headers = authToken ? { Authorization: "Bearer " + authToken } : {};
        fetch("/api/items", { headers })
            .then(async response => {
                const data = await response.json().catch(() => []);
                if (!response.ok) {
                    throw new Error(data.error || "Unable to load inventory");
                }
                return Array.isArray(data) ? data : [];
            })
            .then(items => {
                setInventoryItems(items);
                setQuantityInputs({});
                if (items.length === 0 && updateStatusMessage) {
                    updateStatusMessage("No menu items found in inventory.");
                }
            })
            .catch(error => {
                const message = error.message || "Unable to load inventory";
                setInventoryError(message);
                if (updateStatusMessage) {
                    updateStatusMessage(message);
                }
            })
            .finally(() => setIsLoadingInventory(false));
    }, [shouldShowInventory, authToken, updateStatusMessage]);

    useEffect(() => {
        if (!shouldShowInventory) {
            setInventoryItems([]);
            setQuantityInputs({});
            setInventoryError("");
            return;
        }
        loadInventory();
    }, [shouldShowInventory, loadInventory]);

    useEffect(() => {
        if (!shouldShowInventory) {
            return undefined;
        }
        const intervalId = window.setInterval(() => {
            if (!pendingItemId) {
                loadInventory();
            }
        }, 10000);
        return () => window.clearInterval(intervalId);
    }, [shouldShowInventory, loadInventory, pendingItemId]);

    const handleRefreshInventory = () => {
        if (!shouldShowInventory) {
            return;
        }
        loadInventory();
    };

    const handleQuantityInputChange = (itemId, value) => {
        setQuantityInputs(previous => ({ ...previous, [itemId]: value }));
    };

    const handleAdjustQuantity = async (itemId, mode) => {
        if (!canManageInventory || !shouldShowInventory) {
            return;
        }
        const rawValue = String(getAdjustmentValue(itemId)).trim();
        const amount = Number.parseInt(rawValue, 10);
        if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
            const message = "Enter a positive whole number before adjusting inventory.";
            setInventoryError(message);
            return;
        }
        const delta = mode === "add" ? amount : -amount;
        setPendingItemId(itemId);
        setInventoryError("");
        try {
            const headers = { "Content-Type": "application/json" };
            if (authToken) {
                headers.Authorization = "Bearer " + authToken;
            }
            const response = await fetch(`/api/items/${itemId}/quantity`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ delta }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to update quantity");
            }
            setInventoryItems(previous =>
                previous.map(item => (item.id === data.id ? { ...item, quantity: data.quantity } : item)),
            );
            setQuantityInputs(previous => ({ ...previous, [itemId]: DEFAULT_ADJUSTMENT }));
            if (updateStatusMessage) {
                updateStatusMessage(`Quantity for ${data.name} updated to ${data.quantity}.`);
            }
        } catch (error) {
            const message = error.message || "Unable to update quantity";
            setInventoryError(message);
            if (updateStatusMessage) {
                updateStatusMessage(message);
            }
        } finally {
            setPendingItemId(null);
        }
    };

    const handleCreateInventoryItem = async event => {
        event.preventDefault();
        if (!canManageInventory || !shouldShowInventory) {
            return;
        }
        const trimmedName = (newItem.name || "").trim();
        const trimmedCategory = (newItem.category || "").trim();
        const priceValue = Number(newItem.price);
        const quantityValue = Number.parseInt(String(newItem.quantity ?? "0"), 10);
        setNewItemError("");
        setNewItemMessage("");
        if (!trimmedName) {
            setNewItemError("Item name is required.");
            return;
        }
        if (!Number.isFinite(priceValue) || Number.isNaN(priceValue) || priceValue < 0) {
            setNewItemError("Enter a valid price of $0.00 or higher.");
            return;
        }
        if (!Number.isFinite(quantityValue) || Number.isNaN(quantityValue) || quantityValue < 0) {
            setNewItemError("Quantity must be zero or a positive whole number.");
            return;
        }
        setIsSavingItem(true);
        try {
            const headers = { "Content-Type": "application/json" };
            if (authToken) {
                headers.Authorization = "Bearer " + authToken;
            }
            const payload = {
                name: trimmedName,
                price: Math.round(priceValue * 100) / 100,
                quantity: quantityValue,
            };
            if (trimmedCategory) {
                payload.category = trimmedCategory;
            }
            const response = await fetch("/api/items", {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to add item");
            }
            setInventoryItems(previous => {
                const next = previous.some(item => item.id === data.id)
                    ? previous.map(item => (item.id === data.id ? data : item))
                    : [...previous, data];
                return next.sort((a, b) => {
                    const categoryA = (a.category || "").toLowerCase();
                    const categoryB = (b.category || "").toLowerCase();
                    if (categoryA === categoryB) {
                        return a.name.localeCompare(b.name);
                    }
                    return categoryA.localeCompare(categoryB);
                });
            });
            setQuantityInputs(previous => ({ ...previous, [data.id]: DEFAULT_ADJUSTMENT }));
            setNewItem({ ...EMPTY_ITEM });
            setInventoryError("");
            const message = (data.name || "Menu item") + " added to the menu.";
            setNewItemMessage(message);
            if (updateStatusMessage) {
                updateStatusMessage(message);
            }
        } catch (error) {
            const message = (error && error.message) ? error.message : "Unable to add item";
            setNewItemError(message);
            if (updateStatusMessage) {
                updateStatusMessage(message);
            }
        } finally {
            setIsSavingItem(false);
        }
    };

    const handleDeleteItem = async itemId => {
        if (!canManageInventory || !shouldShowInventory) {
            return;
        }
        const targetItem = inventoryItems.find(item => item.id === itemId);
        const itemName = targetItem?.name || "";
        const confirmationLabel = itemName || "this menu item";
        if (typeof window !== "undefined" && !window.confirm(`Remove ${confirmationLabel} from the menu?`)) {
            setNewItemMessage("");
            return;
        }
        setPendingItemId(itemId);
        setInventoryError("");
        setNewItemError("");
        setNewItemMessage("");
        try {
            const headers = authToken ? { Authorization: "Bearer " + authToken } : {};
            const response = await fetch(`/api/items/${itemId}`, { method: "DELETE", headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to remove item");
            }
            setInventoryItems(previous => previous.filter(item => item.id !== itemId));
            setQuantityInputs(previous => {
                const next = { ...previous };
                delete next[itemId];
                return next;
            });
            const message = itemName ? itemName + " removed from the menu." : "Menu item removed.";
            setNewItemMessage(message);
            if (updateStatusMessage) {
                updateStatusMessage(message);
            }
        } catch (error) {
            const message = (error && error.message) ? error.message : "Unable to remove item";
            setInventoryError(message);
            if (updateStatusMessage) {
                updateStatusMessage(message);
            }
        } finally {
            setPendingItemId(null);
        }
    };

    return (
        <SystemLayout system={system}>
            {!isAuthenticated && (
                <section style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>Staff Sign In</h2>
                    <form onSubmit={onLoginSubmit} style={{ maxWidth: 360 }}>
                        <label style={labelStyle}>
                            Username:
                            <input
                                type="text"
                                name="email"
                                value={loginForm.email}
                                onChange={onLoginChange}
                                required
                                style={inputStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Password:
                            <input
                                type="password"
                                name="password"
                                value={loginForm.password}
                                onChange={onLoginChange}
                                required
                                style={inputStyle}
                            />
                        </label>
                        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                            <button type="submit" style={primaryButtonStyle}>
                                Sign In
                            </button>
                            <button type="button" onClick={goToPath("/order")} style={secondaryButtonStyle}>
                                Customer Page
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {isAuthenticated && user && !isInventoryView && (
                <section style={{ ...cardStyle }}>
                    <h3 style={{ marginTop: 0 }}>Signed in as {user.full_name}</h3>
                    <p>Role: {user.role}</p>
                    <div style={{ marginTop: 16 }}>
                        <button type="button" onClick={onLogout} style={secondaryButtonStyle}>
                            Sign Out
                        </button>
                    </div>


                </section>
            )}

            {shouldShowInventory && (
                <section style={{ ...cardStyle, marginTop: 24 }}>
                    <h3 style={{ marginTop: 0 }}>Inventory</h3>
                    <p style={helperTextStyle}>Track remaining quantities for each menu item.</p>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                            type="button"
                            onClick={handleRefreshInventory}
                            disabled={isLoadingInventory}
                            style={secondaryButtonStyle}
                        >
                            {isLoadingInventory ? "Refreshing..." : "Refresh"}
                        </button>
                        {!canManageInventory && (
                            <span style={helperTextStyle}>Managers can adjust inventory levels.</span>
                        )}
                    </div>
                    {inventoryError && <p style={errorTextStyle}>{inventoryError}</p>}
                    <div style={tableWrapperStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={headerCellStyle}>Item</th>
                                    <th style={headerCellStyle}>Price</th>
                                    <th style={headerCellStyle}>Quantity Remaining</th>
                                    {canManageInventory && <th style={headerCellStyle}>Adjust Quantity</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryItems.map(item => (
                                    <tr key={item.id}>
                                        <td style={cellStyle}>{item.name}</td>
                                        <td style={cellStyle}>{formatCurrency(item.price)}</td>
                                        <td style={cellStyle}>{item.quantity}</td>
                                        {canManageInventory && (
                                            <td style={cellStyle}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={getAdjustmentValue(item.id)}
                                                        onChange={event => handleQuantityInputChange(item.id, event.target.value)}
                                                        style={{ ...inputStyle, maxWidth: 100 }}
                                                        disabled={pendingItemId === item.id}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdjustQuantity(item.id, "add")}
                                                        style={primaryButtonStyle}
                                                        disabled={pendingItemId === item.id}
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdjustQuantity(item.id, "remove")}
                                                        style={{ ...secondaryButtonStyle, background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b" }}
                                                        disabled={pendingItemId === item.id}
                                                    >
                                                        Remove
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        style={{ ...secondaryButtonStyle, background: "#fecaca", borderColor: "#dc2626", color: "#7f1d1d" }}
                                                        disabled={pendingItemId === item.id}
                                                    >
                                                        Delete Item
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {inventoryItems.length === 0 && !isLoadingInventory && (
                                    <tr>
                                        <td style={cellStyle} colSpan={canManageInventory ? 4 : 3}>
                                            No menu items found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {canManageInventory && (
                        <div style={{ marginTop: 24 }}>
                            <h4 style={{ margin: "0 0 8px 0" }}>Add a new menu item</h4>
                            <form onSubmit={handleCreateInventoryItem} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
                                <label style={labelStyle}>
                                    Name:
                                    <input
                                        type="text"
                                        name="name"
                                        value={newItem.name}
                                        onChange={handleNewItemFieldChange}
                                        required
                                        style={inputStyle}
                                    />
                                </label>
                                <label style={labelStyle}>
                                    Category:
                                    <input
                                        type="text"
                                        name="category"
                                        value={newItem.category}
                                        onChange={handleNewItemFieldChange}
                                        style={inputStyle}
                                    />
                                </label>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                    <label style={{ ...labelStyle, flex: "1 1 160px" }}>
                                        Price:
                                        <input
                                            type="number"
                                            name="price"
                                            min="0"
                                            step="0.01"
                                            value={newItem.price}
                                            onChange={handleNewItemFieldChange}
                                            required
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label style={{ ...labelStyle, flex: "1 1 160px" }}>
                                        Starting quantity:
                                        <input
                                            type="number"
                                            name="quantity"
                                            min="0"
                                            step="1"
                                            value={newItem.quantity}
                                            onChange={handleNewItemFieldChange}
                                            required
                                            style={inputStyle}
                                        />
                                    </label>
                                </div>
                                <div>
                                    <button type="submit" disabled={isSavingItem} style={primaryButtonStyle}>
                                        {isSavingItem ? "Saving..." : "Add menu item"}
                                    </button>
                                </div>
                            </form>
                            {newItemError && <p style={errorTextStyle}>{newItemError}</p>}
                            {newItemMessage && <p style={successTextStyle}>{newItemMessage}</p>}
                        </div>
                    )}

                </section>
            )}

            {isManager && !isInventoryView && (
                <section style={{ ...cardStyle, marginTop: 24 }}>
                    <h3 style={{ marginTop: 0 }}>Create a staff account</h3>
                    <form onSubmit={handleCreateAccount} style={{ maxWidth: 360 }}>
                        <label style={labelStyle}>
                            Full name:
                            <input
                                type="text"
                                name="full_name"
                                value={newAccount.full_name}
                                onChange={handleFieldChange}
                                required
                                style={inputStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Username:
                            <input
                                type="text"
                                name="username"
                                value={newAccount.username}
                                onChange={handleFieldChange}
                                required
                                style={inputStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Temporary password:
                            <input
                                type="text"
                                name="password"
                                value={newAccount.password}
                                onChange={handleFieldChange}
                                required
                                style={inputStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Role:
                            <select
                                name="role"
                                value={newAccount.role}
                                onChange={handleFieldChange}
                                style={inputStyle}
                            >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                            </select>
                        </label>
                        <div style={{ marginTop: 16 }}>
                            <button type="submit" disabled={isSavingAccount} style={primaryButtonStyle}>
                                {isSavingAccount ? "Creating..." : "Create account"}
                            </button>
                        </div>
                    </form>
                    {accountMessage && <p style={{ marginTop: 12 }}>{accountMessage}</p>}
                </section>
            )}
        </SystemLayout>
    );
}
