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

const headerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
};

const emptyStateStyle = {
    border: "1px dashed rgba(192, 132, 252, 0.35)",
    borderRadius: 20,
    padding: "18px 20px",
    background: "rgba(255, 255, 255, 0.72)",
    color: "var(--tea-muted)",
    textAlign: "center",
};

const orderItemStyle = {
    display: "grid",
    gap: 8,
    border: "1px solid var(--tea-border-strong)",
    borderRadius: 24,
    padding: "16px 20px",
    background: "var(--tea-surface)",
    boxShadow: "0 14px 32px -26px rgba(15, 23, 42, 0.45)",
};

const metaRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 16,
    flexWrap: "wrap",
};

const detailRowStyle = {
    display: "flex",
    gap: 12,
    color: "var(--tea-muted)",
    fontSize: 13,
    flexWrap: "wrap",
};

export default function OrderSummaryPage({ system, orderItems = [], navigate, onRefresh, isRefreshing }) {
    const hasItems = Array.isArray(orderItems) && orderItems.length > 0;

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 24 }}>
                <div style={headerRowStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 28 }}>Order Summary</h2>
                        <p style={{ margin: "6px 0 0 0", color: "var(--tea-muted)" }}>
                            Thanks for your order! Track brew status and pickup details below.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => navigate("/menu")} style={secondaryButtonStyle}>
                            Order More
                        </button>
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            style={{
                                ...primaryButtonStyle,
                                opacity: isRefreshing ? 0.75 : 1,
                                cursor: isRefreshing ? "wait" : "pointer",
                            }}
                        >
                            {isRefreshing ? "Refreshing..." : "Refresh Status"}
                        </button>
                    </div>
                </div>

                {!hasItems ? (
                    <div style={emptyStateStyle}>No recent order items to display.</div>
                ) : (
                    <div style={{ display: "grid", gap: 16 }}>
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
                            const sugarLabel = (() => {
                                const raw = options?.sugar;
                                if (typeof raw === "string") {
                                    const trimmed = raw.trim();
                                    return trimmed || "";
                                }
                                return raw != null ? String(raw) : "";
                            })();
                            const iceLabel = (() => {
                                const raw = options?.ice;
                                if (typeof raw === "string") {
                                    const trimmed = raw.trim();
                                    return trimmed || "";
                                }
                                return raw != null ? String(raw) : "";
                            })();
                            const itemId = item?.id ?? `order-${index}`;

                            return (
                                <div key={itemId} style={orderItemStyle}>
                                    <div style={metaRowStyle}>
                                        <div style={{ fontWeight: 700, fontSize: 18 }}>#{item?.id ?? ""}</div>
                                        {item?.total_price !== undefined && (
                                            <div style={{ fontWeight: 700 }}>{formatCurrency(item.total_price)}</div>
                                        )}
                                    </div>
                                    {item?.name && <div style={{ color: "#0f172a", fontWeight: 600 }}>{item.name}</div>}
                                    <div style={detailRowStyle}>
                                        <span>Milk: {milkLabel || "None"}</span>
                                        <span>Sugar: {sugarLabel || "N/A"}</span>
                                        <span>Ice: {iceLabel || "N/A"}</span>
                                        <span>Add-ons: {addonLabels.length > 0 ? addonLabels.join(", ") : "None"}</span>
                                    </div>
                                    <div style={{ ...detailRowStyle, fontSize: 14 }}>
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

