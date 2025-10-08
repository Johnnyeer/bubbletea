import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

const formatCurrency = value => {
    const amount = Number(value || 0);
    if (Number.isNaN(amount)) {
        return "$0.00";
    }
    return `$${amount.toFixed(2)}`;
};

// Calculate discounted price for an item based on applied rewards
const calculateDiscountedPrice = (item) => {
    const qty = Number.parseInt(String(item.quantity ?? 1), 10) || 1;
    let basePrice = Number(item.price || 0);
    const appliedRewards = item.appliedRewards || [];
    
    // Check for free drink rewards
    const freeDrinkCount = appliedRewards.filter(id => id.includes('free_drink')).length;
    if (freeDrinkCount > 0) {
        // Free drink makes the entire item free (including milk and add-ons)
        return 0;
    }
    
    // Check for free add-on rewards
    const freeAddonCount = appliedRewards.filter(id => id.includes('free_addon')).length;
    if (freeAddonCount > 0 && item.options?.addons?.length > 0) {
        // Calculate add-on prices to discount the cheapest ones
        const addonLabels = item.options.addons;
        
        // Estimate add-on prices based on common bubble tea pricing
        const estimatedAddonPrices = addonLabels.map(addon => {
            const lowerAddon = addon.toLowerCase();
            // More accurate pricing estimates
            if (lowerAddon.includes('boba') || lowerAddon.includes('tapioca') || lowerAddon.includes('pearls')) {
                return 0.60; // Boba pearls typically cost more
            } else if (lowerAddon.includes('jelly') || lowerAddon.includes('pudding')) {
                return 0.50; // Jelly and pudding standard price
            } else if (lowerAddon.includes('popping') || lowerAddon.includes('burst')) {
                return 0.65; // Popping boba tends to cost more
            } else {
                return 0.50; // Default price for other add-ons
            }
        }).sort((a, b) => a - b); // Sort to apply discounts to cheapest first
        
        // Calculate discount from free add-ons (discount cheapest add-ons first)
        let addonDiscount = 0;
        for (let i = 0; i < Math.min(freeAddonCount, estimatedAddonPrices.length); i++) {
            addonDiscount += estimatedAddonPrices[i];
        }
        
        // Apply the discount
        basePrice = Math.max(0, basePrice - addonDiscount);
    }
    
    return basePrice * qty;
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

export default function CartPage({ system, cartItems = [], navigate, onCheckout, isCheckingOut, availableRewards = [], session, onUpdateCartItem }) {
    const total = (cartItems || []).reduce((sum, item) => {
        return sum + calculateDiscountedPrice(item);
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
                    {/* Navigation button removed for streamlined UI */}
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
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 8, 
                                            fontWeight: 700, 
                                            fontSize: 18 
                                        }}>
                                            {item.name || "Item"}
                                            {item.appliedRewards && item.appliedRewards.length > 0 && (
                                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                    {item.appliedRewards.map((rewardId, index) => {
                                                        const rewardType = rewardId.includes('free_drink') ? 'free_drink' : 'free_addon';
                                                        return (
                                                            <span key={rewardId} style={{
                                                                background: "#dcfce7",
                                                                color: "#166534",
                                                                padding: "2px 8px",
                                                                borderRadius: 12,
                                                                fontSize: 12,
                                                                fontWeight: 500,
                                                                border: "1px solid #bbf7d0"
                                                            }}>
                                                                {rewardType === 'free_drink' && '🎯 FREE DRINK'}
                                                                {rewardType === 'free_addon' && '✨ FREE ADD-ON'}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div style={cartItemMetaStyle}>
                                                                    <div style={cartItemMetaStyle}>
                            {(() => {
                                const originalPrice = (item.price || 0) * qty;
                                const discountedPrice = calculateDiscountedPrice(item);
                                const hasDiscount = discountedPrice < originalPrice;
                                
                                if (hasDiscount) {
                                    return (
                                        <span>
                                            {qty} x <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>{formatCurrency(item.price)}</span> → {formatCurrency(discountedPrice / qty)}
                                        </span>
                                    );
                                } else {
                                    return `${qty} x ${formatCurrency(item.price)}`;
                                }
                            })()}
                        </div>
                                        </div>
                                        {detailText && (
                                            <div style={{ ...cartItemMetaStyle, fontSize: 13 }}>
                                                {detailText}
                                            </div>
                                        )}
                                        {item.appliedRewards && item.appliedRewards.length > 0 && (
                                            <div style={{ 
                                                ...cartItemMetaStyle, 
                                                fontSize: 12, 
                                                color: "#166534",
                                                fontWeight: 500
                                            }}>
                                                {(() => {
                                                    const freeDrinks = item.appliedRewards.filter(id => id.includes('free_drink')).length;
                                                    const freeAddons = item.appliedRewards.filter(id => id.includes('free_addon')).length;
                                                    const messages = [];
                                                    
                                                    if (freeDrinks > 0) {
                                                        messages.push(`This drink will be free!`);
                                                    }
                                                    if (freeAddons > 0) {
                                                        messages.push(`${freeAddons} cheapest add-on${freeAddons > 1 ? 's' : ''} will be free!`);
                                                    }
                                                    
                                                    return messages.join(' ');
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 18 }}>
                                        {(() => {
                                            const originalPrice = (item.price || 0) * qty;
                                            const discountedPrice = calculateDiscountedPrice(item);
                                            const hasDiscount = discountedPrice < originalPrice;
                                            
                                            if (hasDiscount) {
                                                return (
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: 14, textDecoration: 'line-through', color: '#9ca3af' }}>
                                                            {formatCurrency(originalPrice)}
                                                        </div>
                                                        <div style={{ color: '#166534', fontWeight: 700 }}>
                                                            {formatCurrency(discountedPrice)}
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                return formatCurrency(originalPrice);
                                            }
                                        })()}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Reward Application Section */}
                        {session?.isAuthenticated && availableRewards.length > 0 && (
                            <div style={{
                                border: "1px solid var(--tea-border)",
                                borderRadius: 12,
                                padding: "16px",
                                background: "rgba(248, 250, 252, 0.8)",
                                marginTop: "8px"
                            }}>
                                <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#0f172a" }}>
                                    🎁 Apply Rewards to Items
                                </h4>
                                <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "var(--tea-muted)" }}>
                                    Select cart items and apply your available rewards. You have {availableRewards.length} reward{availableRewards.length > 1 ? 's' : ''} available.
                                </p>
                                
                                {cartItems.map(item => {
                                    const currentRewards = item.appliedRewards || [];
                                    
                                    return (
                                        <div key={item.id} style={{
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 8,
                                            padding: "12px",
                                            marginBottom: "8px",
                                            background: "#ffffff"
                                        }}>
                                            <div style={{ 
                                                fontWeight: 500, 
                                                marginBottom: 8,
                                                fontSize: 14
                                            }}>
                                                {item.name} {currentRewards.length > 0 && `(${currentRewards.length} reward${currentRewards.length > 1 ? 's' : ''} applied)`}
                                            </div>
                                            
                                            <div style={{ display: "grid", gap: 8 }}>
                                                {(() => {
                                                    // Group available rewards by type
                                                    const rewardsByType = {};
                                                    availableRewards.forEach(reward => {
                                                        if (!rewardsByType[reward.type]) {
                                                            rewardsByType[reward.type] = [];
                                                        }
                                                        rewardsByType[reward.type].push(reward);
                                                    });

                                                    const handleRewardToggle = (rewardId) => {
                                                        const newRewards = currentRewards.includes(rewardId)
                                                            ? currentRewards.filter(id => id !== rewardId)
                                                            : [...currentRewards, rewardId];
                                                        
                                                        onUpdateCartItem(item.id, { appliedRewards: newRewards });
                                                    };

                                                    return Object.entries(rewardsByType).map(([type, rewards]) => (
                                                        <div key={type} style={{ 
                                                            padding: "8px",
                                                            background: "#f9fafb",
                                                            borderRadius: 6
                                                        }}>
                                                            <div style={{ 
                                                                fontSize: 13, 
                                                                fontWeight: 500,
                                                                marginBottom: 6,
                                                                color: "#374151"
                                                            }}>
                                                                {type === 'free_drink' && '🎯 Free Drinks'} 
                                                                {type === 'free_addon' && '✨ Free Add-ons (cheapest add-ons will be free)'}
                                                            </div>
                                                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                                {rewards.map((reward, index) => {
                                                                    const isApplied = currentRewards.includes(reward.id);
                                                                    const canApply = type === 'free_drink' || (type === 'free_addon' && item.options?.addons?.length > 0);
                                                                    
                                                                    return (
                                                                        <button
                                                                            key={reward.id}
                                                                            onClick={() => canApply && handleRewardToggle(reward.id)}
                                                                            disabled={!canApply}
                                                                            style={{
                                                                                padding: "4px 8px",
                                                                                borderRadius: 12,
                                                                                border: `1px solid ${isApplied ? "#3b82f6" : "#d1d5db"}`,
                                                                                background: isApplied ? "#dbeafe" : canApply ? "#ffffff" : "#f3f4f6",
                                                                                color: isApplied ? "#1e40af" : canApply ? "#374151" : "#9ca3af",
                                                                                fontSize: 12,
                                                                                fontWeight: 500,
                                                                                cursor: canApply ? "pointer" : "not-allowed",
                                                                                transition: "all 0.2s ease"
                                                                            }}
                                                                        >
                                                                            {isApplied ? "✓ " : ""}#{index + 1}
                                                                            {!canApply && type === 'free_addon' && " (no add-ons)"}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

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

