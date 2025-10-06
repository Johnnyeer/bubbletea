import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

const formatCurrency = value => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) {
        return "$0.00";
    }
    return `$${amount.toFixed(2)}`;
};

const headerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
};

const emptyStateStyle = {
    border: "1px dashed rgba(249, 115, 22, 0.35)",
    borderRadius: 20,
    padding: "18px 20px",
    background: "rgba(255, 255, 255, 0.72)",
    color: "var(--tea-muted)",
    textAlign: "center",
};

const cartItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    border: "1px solid var(--tea-border-strong)",
    borderRadius: 24,
    padding: "16px 20px",
    background: "var(--tea-surface)",
    boxShadow: "0 14px 32px -26px rgba(15, 23, 42, 0.45)",
};

const cartItemMetaStyle = {
    color: "var(--tea-muted)",
    fontSize: 14,
};

const totalRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingTop: 12,
    borderTop: "1px solid var(--tea-border)",
    color: "#0f172a",
    fontSize: 18,
};

export default function CartPage({ system, cartItems = [], navigate, onCheckout, isCheckingOut }) {
    const total = (cartItems || []).reduce((sum, item) => {
        const qty = Number.parseInt(String(item.quantity ?? 1), 10) || 1;
        const price = Number(item.price || 0);
        return sum + price * qty;
    }, 0);

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 24 }}>
                <div style={headerRowStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 28 }}>Your Cart</h2>
                        <p style={{ margin: "6px 0 0 0", color: "var(--tea-muted)" }}>
                            Review your blends before completing checkout.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => navigate("/menu")} style={secondaryButtonStyle}>
                            Back to Menu
                        </button>
                    </div>
                </div>

                {(cartItems || []).length === 0 ? (
                    <div style={emptyStateStyle}>
                        Your cart is empty. Explore the menu to add your favorite drinks.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 16 }}>
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

                            const detailText = details.join(" | ");

                            return (
                                <div key={item.id} style={cartItemStyle}>
                                    <div style={{ display: "grid", gap: 4 }}>
                                        <div style={{ fontWeight: 700, fontSize: 18 }}>{item.name || "Item"}</div>
                                        <div style={cartItemMetaStyle}>
                                            {qty} x {formatCurrency(item.price)}
                                        </div>
                                        {detailText && (
                                            <div style={{ ...cartItemMetaStyle, fontSize: 13 }}>
                                                {detailText}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 18 }}>
                                        {formatCurrency((item.price || 0) * qty)}
                                    </div>
                                </div>
                            );
                        })}

                        <div style={totalRowStyle}>
                            <strong>Total</strong>
                            <strong>{formatCurrency(total)}</strong>
                        </div>

                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={onCheckout}
                                disabled={isCheckingOut}
                                style={{
                                    ...primaryButtonStyle,
                                    opacity: isCheckingOut ? 0.75 : 1,
                                    cursor: isCheckingOut ? "wait" : "pointer",
                                }}
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

