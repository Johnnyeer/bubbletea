import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

const formatCurrency = value => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) {
        return "$0.00";
    }
    return `$${amount.toFixed(2)}`;
};

export default function CartPage({ system, cartItems = [], navigate, onCheckout, isCheckingOut }) {
    const total = (cartItems || []).reduce((sum, item) => {
        const qty = Number.parseInt(String(item.quantity ?? 1), 10) || 1;
        const price = Number(item.price || 0);
        return sum + price * qty;
    }, 0);

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Your Cart</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#4a5568" }}>Review your selections before checkout.</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => navigate("/menu")} style={secondaryButtonStyle}>Back to Order Menu</button>
                    </div>
                </div>

                {(cartItems || []).length === 0 ? (
                    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 16, background: "#f8fafc" }}>
                        Your cart is empty. Browse the menu to add items.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        {(cartItems || []).map(item => {
                            const qty = Number.parseInt(String(item.quantity ?? 1), 10) || 1;
                            const details = [];
                            const milkLabel = item?.options?.milk;
                            if (milkLabel && milkLabel !== "None") {
                                details.push(`Milk: ${milkLabel}`);
                            }
                            const sugarLabel = item?.options?.sugar;
                            if (sugarLabel) {
                                details.push(`Sugar: ${sugarLabel}`);
                            }
                            const iceLabel = item?.options?.ice;
                            if (iceLabel) {
                                details.push(`Ice: ${iceLabel}`);
                            }
                            const addonLabels = Array.isArray(item?.options?.addons) ? item.options.addons : [];
                            if (addonLabels.length > 0) {
                                details.push(`Add-ons: ${addonLabels.join(", ")}`);
                            }
                            return (
                                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, background: "#fff" }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{item.name || "Item"}</div>
                                        <div style={{ color: "#475569", fontSize: 14 }}>
                                            {qty} x {formatCurrency(item.price)}
                                        </div>
                                        {details.length > 0 && (
                                            <div style={{ color: "#64748b", fontSize: 13 }}>{details.join(", ")}</div>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 700 }}>{formatCurrency((item.price || 0) * qty)}</div>
                                </div>
                            );
                        })}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                            <strong>Total</strong>
                            <strong>{formatCurrency(total)}</strong>
                        </div>

                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={onCheckout}
                                disabled={isCheckingOut}
                                style={{ ...primaryButtonStyle, opacity: isCheckingOut ? 0.7 : 1, cursor: isCheckingOut ? "wait" : "pointer" }}
                            >
                                {isCheckingOut ? "Placing order..." : "Checkout"}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </SystemLayout>
    );
}

