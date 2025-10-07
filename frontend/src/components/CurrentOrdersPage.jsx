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

const formatDateTime = value => {
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value || "");
        return d.toLocaleString();
    } catch {
        return String(value || "");
    }
};

const ORDER_STATUSES = ["received", "preparing", "complete"];

const formatStatus = status => {
    if (!status) {
        return "";
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const toTimestamp = value => {
    if (!value) {
        return Number.MAX_SAFE_INTEGER;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
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

const orderDetailsStyle = {
    display: "flex",
    gap: 16,
    color: "var(--tea-muted)",
    fontSize: 14,
    flexWrap: "wrap",
};

const orderNotesStyle = {
    color: "rgba(15, 23, 42, 0.72)",
    fontSize: 13,
};

const emptyStateStyle = {
    border: "1px dashed rgba(34, 211, 238, 0.35)",
    borderRadius: 20,
    padding: "18px 20px",
    background: "rgba(255, 255, 255, 0.72)",
    color: "var(--tea-muted)",
    textAlign: "center",
};

const getStatusButtonStyle = (isActive, isPending) => ({
    ...secondaryButtonStyle,
    padding: "8px 16px",
    borderColor: isActive ? "rgba(249, 115, 22, 0.45)" : "rgba(15, 23, 42, 0.14)",
    background: isActive ? "rgba(249, 115, 22, 0.18)" : "rgba(255, 255, 255, 0.72)",
    color: isActive ? "#0f172a" : "#1f2937",
    opacity: isPending ? 0.7 : 1,
    cursor: isPending ? "wait" : "pointer",
});

const getDeleteButtonStyle = isPending => ({
    ...secondaryButtonStyle,
    padding: "8px 16px",
    borderColor: "rgba(239, 68, 68, 0.32)",
    background: "rgba(254, 202, 202, 0.72)",
    color: "#b91c1c",
    opacity: isPending ? 0.7 : 1,
    cursor: isPending ? "wait" : "pointer",
});

export default function CurrentOrdersPage({ system, session }) {
    const userRole = typeof session?.user?.role === "string" ? session.user.role.toLowerCase() : "customer";
    const isStaff = userRole === "staff" || userRole === "manager";
    const token = session?.token || "";
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [pendingUpdateId, setPendingUpdateId] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const updateStatus = typeof system?.onStatusMessage === "function" ? system.onStatusMessage : null;

    const headers = useMemo(() => (token ? { Authorization: "Bearer " + token } : {}), [token]);

    const loadOrders = () => {
        if (!isStaff) return;
        setIsLoading(true);
        setError("");
        fetch("/api/v1/orders", { headers })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Unable to load orders");
                }
                const collection = Array.isArray(data) ? data : Array.isArray(data.order_items) ? data.order_items : [];
                return collection;
            })
            .then(collection => {
                const filtered = collection.filter(item => item.status !== "complete");
                const sorted = [...filtered].sort((a, b) => toTimestamp(a.created_at) - toTimestamp(b.created_at));
                setItems(sorted);
                if (sorted.length === 0 && updateStatus) {
                    updateStatus("No current orders.");
                }
            })
            .catch(err => {
                const message = err.message || "Unable to load orders";
                setError(message);
                updateStatus?.(message);
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (!isStaff) return;
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStaff, token]);

    if (!isStaff) {
        return (
            <SystemLayout system={system}>
                <section style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>Current Orders</h2>
                    <p>Staff access required.</p>
                </section>
            </SystemLayout>
        );
    }

    const handleStatusUpdate = async (orderId, desiredStatus) => {
        const order = items.find(item => item.id === orderId);
        if (!order || !desiredStatus || desiredStatus === order.status) {
            if (desiredStatus === order?.status) {
                updateStatus?.("Order already has that status.");
            }
            return;
        }

        setPendingUpdateId(orderId);
        setError("");
        try {
            const response = await fetch(`/api/v1/orders/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...headers,
                },
                body: JSON.stringify({ status: desiredStatus }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to update order status");
            }
            const nextStatus = data.status || desiredStatus;
            setItems(previous => {
                if (nextStatus === "complete") {
                    return previous.filter(item => item.id !== orderId);
                }
                return previous.map(item => (item.id === orderId ? { ...item, ...data, status: nextStatus } : item));
            });
            const message = nextStatus === "complete"
                ? `Order #${orderId} marked complete.`
                : `Order #${orderId} status updated to ${formatStatus(nextStatus)}.`;
            updateStatus?.(message);
        } catch (err) {
            const message = err.message || "Unable to update order status";
            setError(message);
            updateStatus?.(message);
        } finally {
            setPendingUpdateId(null);
        }
    };

    const handleDelete = async orderId => {
        const order = items.find(entry => entry.id === orderId);
        if (!order) {
            return;
        }

        setPendingDeleteId(orderId);
        setError("");
        try {
            const response = await fetch(`/api/v1/orders/${orderId}`, {
                method: "DELETE",
                headers,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || data.message || "Unable to delete order");
            }
            setItems(previous => previous.filter(entry => entry.id !== orderId));
            const message = data.message || `Order #${orderId} deleted.`;
            updateStatus?.(message);
        } catch (err) {
            const message = err.message || "Unable to delete order";
            setError(message);
            updateStatus?.(message);
        } finally {
            setPendingDeleteId(null);
        }
    };

    const renderOrderDetails = item => {
        const lines = [];
        const milkLabel = item?.options?.milk;
        if (milkLabel && milkLabel !== "None") {
            lines.push(`Milk: ${milkLabel}`);
        }
        const sugarLabel = item?.options?.sugar;
        if (sugarLabel) {
            lines.push(`Sugar: ${sugarLabel}`);
        }
        const iceLabel = item?.options?.ice;
        if (iceLabel) {
            lines.push(`Ice: ${iceLabel}`);
        }
        const addonLabels = Array.isArray(item?.options?.addons) ? item.options.addons : [];
        if (addonLabels.length > 0) {
            lines.push(`Add-ons: ${addonLabels.join(", ")}`);
        }
        return lines.length > 0 ? lines.join(" | ") : null;
    };

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 24 }}>
                <div style={headerRowStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 28 }}>Current Orders</h2>
                        <p style={headerTextStyle}>Incoming items with their status.</p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={loadOrders} style={primaryButtonStyle} disabled={isLoading}>
                            {isLoading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>

                {error && <div style={errorBannerStyle}>{error}</div>}

                <div style={{ display: "grid", gap: 16 }}>
                    {items.map(item => {
                        const detailText = renderOrderDetails(item);
                        const isPendingUpdate = pendingUpdateId === item.id;
                        const isPendingDelete = pendingDeleteId === item.id;
                        const isPending = isPendingUpdate || isPendingDelete;
                        return (
                            <div key={item.id} style={orderCardStyle}>
                                <div style={orderMetaStyle}>
                                    <div style={{ fontWeight: 700, fontSize: 18 }}>#{item.id} {item.name ? `- ${item.name}` : ""}</div>
                                    {item.total_price !== undefined && <div style={{ fontWeight: 700 }}>{formatCurrency(item.total_price)}</div>}
                                </div>
                                <div style={orderDetailsStyle}>
                                    {item.status && <span>Status: {formatStatus(item.status)}</span>}
                                    {item.created_at && <span>Placed: {formatDateTime(item.created_at)}</span>}
                                    {item.member_name && <span>Member: {item.member_name}</span>}
                                </div>
                                {detailText && <div style={orderNotesStyle}>{detailText}</div>}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {ORDER_STATUSES.map(status => {
                                        const isActive = item.status === status;
                                        return (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => handleStatusUpdate(item.id, status)}
                                                disabled={isPending || isActive}
                                                style={getStatusButtonStyle(isActive, isPending)}
                                            >
                                                {formatStatus(status)}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item.id)}
                                        disabled={isPending}
                                        style={getDeleteButtonStyle(isPending)}
                                    >
                                        {isPendingDelete ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {items.length === 0 && !isLoading && <div style={emptyStateStyle}>No current orders.</div>}
                </div>
            </section>
        </SystemLayout>
    );
}


