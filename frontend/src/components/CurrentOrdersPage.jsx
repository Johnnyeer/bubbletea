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

export default function CurrentOrdersPage({ system, session }) {
    const userRole = typeof session?.user?.role === "string" ? session.user.role.toLowerCase() : "customer";
    const isStaff = userRole === "staff" || userRole === "manager";
    const token = session?.token || "";
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [pendingUpdateId, setPendingUpdateId] = useState(null);

    const updateStatus = typeof system?.onStatusMessage === "function" ? system.onStatusMessage : null;

    const headers = useMemo(() => (token ? { Authorization: "Bearer " + token } : {}), [token]);

    const loadOrders = () => {
        if (!isStaff) return;
        setIsLoading(true);
        setError("");
        fetch("/api/orders", { headers })
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
            const response = await fetch(`/api/orders/${orderId}`, {
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

    const renderOrderDetails = item => {
        const lines = [];
        const milkLabel = item?.options?.milk;
        if (milkLabel && milkLabel !== "None") {
            lines.push(`Milk: ${milkLabel}`);
        }
        const addonLabels = Array.isArray(item?.options?.addons) ? item.options.addons : [];
        if (addonLabels.length > 0) {
            lines.push(`Add-ons: ${addonLabels.join(", ")}`);
        }
        return lines.length > 0 ? lines.join(" | ") : null;
    };

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Current Orders</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#4a5568" }}>Incoming items with their status.</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={loadOrders} style={primaryButtonStyle} disabled={isLoading}>
                            {isLoading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ border: "1px solid #fca5a5", background: "#fee2e2", borderRadius: 8, padding: 12, color: "#991b1b" }}>{error}</div>
                )}

                <div style={{ display: "grid", gap: 12 }}>
                    {items.map(item => {
                        const detailText = renderOrderDetails(item);
                        return (
                            <div key={item.id} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, background: "#fff", display: "grid", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ fontWeight: 700 }}>#{item.id} {item.name ? `- ${item.name}` : ""}</div>
                                    {item.total_price !== undefined && <div style={{ fontWeight: 700 }}>{formatCurrency(item.total_price)}</div>}
                                </div>
                                <div style={{ display: "flex", gap: 16, color: "#475569", fontSize: 14, flexWrap: "wrap" }}>
                                    {item.status && <span>Status: {formatStatus(item.status)}</span>}
                                    {item.created_at && <span>Placed: {formatDateTime(item.created_at)}</span>}
                                    {item.member_name && <span>Member: {item.member_name}</span>}
                                </div>
                                {detailText && (
                                    <div style={{ color: "#64748b", fontSize: 13 }}>{detailText}</div>
                                )}
                                {isStaff && (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {ORDER_STATUSES.map(status => {
                                            const isActive = item.status === status;
                                            const isPending = pendingUpdateId === item.id;
                                            const baseStyle = {
                                                ...secondaryButtonStyle,
                                                padding: "6px 12px",
                                                borderColor: isActive ? "#2563eb" : "#cbd5e1",
                                                background: isActive ? "#dbeafe" : "#f8fafc",
                                                color: isActive ? "#1e3a8a" : "#1f2937",
                                                opacity: isPending ? 0.7 : 1,
                                                cursor: isPending ? "wait" : "pointer",
                                            };
                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => handleStatusUpdate(item.id, status)}
                                                    disabled={isPending || isActive}
                                                    style={baseStyle}
                                                >
                                                    {formatStatus(status)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {items.length === 0 && !isLoading && (
                        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 16, background: "#f8fafc" }}>No current orders.</div>
                    )}
                </div>
            </section>
        </SystemLayout>
    );
}

