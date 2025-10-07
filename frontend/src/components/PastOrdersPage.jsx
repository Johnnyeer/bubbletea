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

const headerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
};

const headerTextStyle = {
    margin: "6px 0 0 0",
    color: "var(--tea-muted)",
};

const errorBannerStyle = {
    border: "1px solid rgba(239, 68, 68, 0.32)",
    background: "rgba(254, 226, 226, 0.78)",
    borderRadius: 20,
    padding: "14px 18px",
    color: "#9f1239",
    fontWeight: 600,
};

const orderCardStyle = {
    border: "1px solid var(--tea-border-strong)",
    borderRadius: 24,
    padding: "18px 20px",
    background: "var(--tea-surface)",
    display: "grid",
    gap: 10,
    boxShadow: "0 14px 32px -26px rgba(15, 23, 42, 0.45)",
};

const orderMetaStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 16,
    flexWrap: "wrap",
};

const orderInfoStyle = {
    display: "flex",
    gap: 16,
    color: "var(--tea-muted)",
    fontSize: 14,
    flexWrap: "wrap",
};

const optionSummaryStyle = {
    color: "rgba(15, 23, 42, 0.72)",
    fontSize: 13,
};

const emptyStateStyle = {
    border: "1px dashed rgba(192, 132, 252, 0.35)",
    borderRadius: 20,
    padding: "18px 20px",
    background: "rgba(255, 255, 255, 0.72)",
    color: "var(--tea-muted)",
    textAlign: "center",
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
        fetch("/api/v1/orders", { headers })
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
                <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                    <h2 style={{ margin: 0 }}>Past Orders</h2>
                    <p>Please sign in to view your order history.</p>
                </section>
            </SystemLayout>
        );
    }

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 24 }}>
                <div style={headerRowStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 28 }}>Past Orders</h2>
                        <p style={headerTextStyle}>Review your previously completed drinks.</p>
                    </div>
                    <button
                        type="button"
                        onClick={loadHistory}
                        style={{
                            ...primaryButtonStyle,
                            minWidth: 140,
                            opacity: isLoading ? 0.75 : 1,
                            cursor: isLoading ? "wait" : "pointer",
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {error && <div style={errorBannerStyle}>{error}</div>}

                <div style={{ display: "grid", gap: 16 }}>
                    {orders.map(item => {
                        const optionSummary = renderOptions(item);
                        const createdLabel = item?.created_at ? formatDateTime(item.created_at) : null;
                        const completedLabel = item?.completed_at ? formatDateTime(item.completed_at) : null;
                        return (
                            <div key={item.id} style={orderCardStyle}>
                                <div style={orderMetaStyle}>
                                    <div style={{ fontWeight: 700, fontSize: 18 }}>#{item.id}{item.name ? ` - ${item.name}` : ""}</div>
                                    <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                                        {item.quantity !== undefined && <span style={{ color: "var(--tea-muted)", fontSize: 14 }}>Qty: {item.quantity}</span>}
                                        {item.total_price !== undefined && <span style={{ fontWeight: 700 }}>{formatCurrency(item.total_price)}</span>}
                                    </div>
                                </div>
                                <div style={orderInfoStyle}>
                                    <span>Status: {formatStatus(item.status || "complete")}</span>
                                    {createdLabel && <span>Ordered: {createdLabel}</span>}
                                    {completedLabel && <span>Completed: {completedLabel}</span>}
                                </div>
                                {optionSummary && <div style={optionSummaryStyle}>{optionSummary}</div>}
                            </div>
                        );
                    })}
                    {orders.length === 0 && !isLoading && <div style={emptyStateStyle}>You have not completed any orders yet.</div>}
                </div>
            </section>
        </SystemLayout>
    );
}



