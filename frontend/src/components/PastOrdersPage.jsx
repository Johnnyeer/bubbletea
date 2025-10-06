import { useCallback, useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle } from "./styles.js";

const formatCurrency = value => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) {
        return "$0.00";
    }
    return `$${amount.toFixed(2)}`;
};

const formatDateTime = value => {
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
            return String(value || "");
        }
        return d.toLocaleString();
    } catch {
        return String(value || "");
    }
};

const formatStatus = status => {
    if (!status) {
        return "";
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const toTimestamp = value => {
    if (!value) {
        return 0;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
};

const getSortValue = item => {
    const completed = toTimestamp(item?.completed_at);
    const created = toTimestamp(item?.created_at);
    return Math.max(completed, created);
};

const isCompletedOrder = item => {
    const status = typeof item?.status === "string" ? item.status.toLowerCase() : "";
    return status === "complete" || Boolean(item?.completed_at);
};

const renderOptions = item => {
    const parts = [];
    const milk = item?.options?.milk;
    if (milk && milk !== "None") {
        parts.push(`Milk: ${milk}`);
    }
    const sugar = item?.options?.sugar;
    if (sugar) {
        parts.push(`Sugar: ${sugar}`);
    }
    const ice = item?.options?.ice;
    if (ice) {
        parts.push(`Ice: ${ice}`);
    }
    const addons = Array.isArray(item?.options?.addons) ? item.options.addons : [];
    if (addons.length > 0) {
        parts.push(`Add-ons: ${addons.join(", ")}`);
    }
    return parts.join(" | ");
};

export default function PastOrdersPage({ system, session }) {
    const isAuthenticated = Boolean(session?.isAuthenticated);
    const token = session?.token || "";
    const updateStatus = typeof system?.onStatusMessage === "function" ? system.onStatusMessage : null;

    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const headers = useMemo(() => (token ? { Authorization: "Bearer " + token } : {}), [token]);

    const loadHistory = useCallback(() => {
        if (!isAuthenticated || !token) {
            return;
        }
        setIsLoading(true);
        setError("");
        fetch("/api/orders", { headers })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Unable to load past orders");
                }
                const collection = Array.isArray(data)
                    ? data
                    : Array.isArray(data.order_items)
                        ? data.order_items
                        : [];
                return collection.filter(isCompletedOrder);
            })
            .then(collection => {
                const sorted = [...collection].sort((a, b) => getSortValue(b) - getSortValue(a));
                setOrders(sorted);
                if (sorted.length === 0 && updateStatus) {
                    updateStatus("No past orders yet.");
                } else if (sorted.length > 0 && updateStatus) {
                    updateStatus("");
                }
            })
            .catch(err => {
                const message = err.message || "Unable to load past orders";
                setError(message);
                updateStatus?.(message);
            })
            .finally(() => setIsLoading(false));
    }, [headers, isAuthenticated, token, updateStatus]);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            setOrders([]);
            setIsLoading(false);
            return;
        }
        loadHistory();
    }, [isAuthenticated, token, loadHistory]);

    if (!isAuthenticated) {
        return (
            <SystemLayout system={system}>
                <section style={{ ...cardStyle, display: "grid", gap: 12 }}>
                    <h2 style={{ margin: 0 }}>Past Orders</h2>
                    <p>Please sign in to view your order history.</p>
                </section>
            </SystemLayout>
        );
    }

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Past Orders</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#4a5568" }}>Review your previously completed drinks.</p>
                    </div>
                    <button
                        type="button"
                        onClick={loadHistory}
                        style={{ ...primaryButtonStyle, minWidth: 120, opacity: isLoading ? 0.85 : 1, cursor: isLoading ? "wait" : "pointer" }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {error && (
                    <div style={{ border: "1px solid #fca5a5", background: "#fee2e2", borderRadius: 8, padding: 12, color: "#991b1b" }}>{error}</div>
                )}

                <div style={{ display: "grid", gap: 12 }}>
                    {orders.map(item => {
                        const optionSummary = renderOptions(item);
                        const createdLabel = item?.created_at ? formatDateTime(item.created_at) : null;
                        const completedLabel = item?.completed_at ? formatDateTime(item.completed_at) : null;
                        return (
                            <div key={item.id} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, background: "#fff", display: "grid", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ fontWeight: 700 }}>#{item.id}{item.name ? ` - ${item.name}` : ""}</div>
                                    <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                                        {item.quantity !== undefined && <span style={{ color: "#475569", fontSize: 14 }}>Qty: {item.quantity}</span>}
                                        {item.total_price !== undefined && <span style={{ fontWeight: 700 }}>{formatCurrency(item.total_price)}</span>}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 16, color: "#475569", fontSize: 14, flexWrap: "wrap" }}>
                                    <span>Status: {formatStatus(item.status || "complete")}</span>
                                    {createdLabel && <span>Ordered: {createdLabel}</span>}
                                    {completedLabel && <span>Completed: {completedLabel}</span>}
                                </div>
                                {optionSummary && <div style={{ color: "#64748b", fontSize: 13 }}>{optionSummary}</div>}
                            </div>
                        );
                    })}
                    {orders.length === 0 && !isLoading && (
                        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 16, background: "#f8fafc" }}>You have not completed any orders yet.</div>
                    )}
                </div>
            </section>
        </SystemLayout>
    );
}

