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

export default function OrderSummaryPage({ system, orderItems = [], navigate, onRefresh, isRefreshing }) {
    const hasItems = Array.isArray(orderItems) && orderItems.length > 0;

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Order Summary</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#4a5568" }}>Thanks for your order! Track the status below.</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => navigate("/menu")} style={secondaryButtonStyle}>Order More</button>
                        <button type="button" onClick={onRefresh} disabled={isRefreshing} style={{ ...primaryButtonStyle, opacity: isRefreshing ? 0.7 : 1, cursor: isRefreshing ? "wait" : "pointer" }}>
                            {isRefreshing ? "Refreshing..." : "Refresh Status"}
                        </button>
                    </div>
                </div>

                {!hasItems ? (
                    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 16, background: "#f8fafc" }}>
                        No recent order items to display.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        {orderItems.map((item, index) => {
                            if (!item || typeof item !== "object") {
                                return null;
                            }

                            const options = (item.options && typeof item.options === "object") ? item.options : {};

                            const rawMilk = options?.milk;
                            let milkLabel = "None";
                            if (typeof rawMilk === "string") {
                                milkLabel = rawMilk.trim() || "None";
                            } else if (rawMilk != null) {
                                milkLabel = String(rawMilk);
                            }

                            const addonLabels = Array.isArray(options?.addons)
                                ? options.addons
                                      .map(label => (typeof label === "string" ? label.trim() : String(label)))
                                      .filter(Boolean)
                                : [];

                            const itemId = item?.id ?? `order-${index}`;

                            return (
                                <div key={itemId} style={{ display: "grid", gap: 6, border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, background: "#fff" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                                        <div style={{ fontWeight: 700 }}>#{item?.id ?? ""}</div>
                                        {item?.total_price !== undefined && (
                                            <div style={{ fontWeight: 700 }}>{formatCurrency(item.total_price)}</div>
                                        )}
                                    </div>
                                    {item?.name && <div style={{ color: "#334155" }}>{item.name}</div>}
                                    <div style={{ display: "flex", gap: 12, color: "#64748b", fontSize: 13, flexWrap: "wrap" }}>
                                        <span>Milk: {milkLabel || "None"}</span>
                                        <span>Add-ons: {addonLabels.length > 0 ? addonLabels.join(", ") : "None"}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 16, color: "#475569", fontSize: 14, flexWrap: "wrap" }}>
                                        {item?.status && <span>Status: {String(item.status)}</span>}
                                        {item?.created_at && <span>Placed: {formatDateTime(item.created_at)}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </SystemLayout>
    );
}
