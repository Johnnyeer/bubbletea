import { useState, useEffect } from 'react';
import {
    cardStyle,
    inputStyle,
    labelStyle,
    primaryButtonStyle,
    secondaryButtonStyle,
    getCardStyle,
    getPrimaryButtonStyle,
    getSecondaryButtonStyle,
    getInputStyle,
    getLabelStyle,
} from './styles.js';

export default function OrderPage({
    navigate,
    loginForm,
    statusMessage,
    onLoginChange,
    onLoginSubmit,
    onGuestCheckout,
    isAuthenticated,
    onLogout,
    user,
}) {

    
    // Use dynamic themed styles - OrderPage is typically customer-facing
    const themedCardStyle = getCardStyle();
    const themedPrimaryButtonStyle = getPrimaryButtonStyle();
    const themedSecondaryButtonStyle = getSecondaryButtonStyle();
    const themedInputStyle = getInputStyle();
    const themedLabelStyle = getLabelStyle();
    
    return (
        <div className="order-page">
            <main className="order-page__main">
                <div className="order-page__inner">
                    {isAuthenticated ? (
                        user?.role === 'customer' ? (
                            <CustomerAccountPage user={user} onLogout={onLogout} navigate={navigate} />
                        ) : (
                            <section style={{ ...cardStyle, display: 'grid', gap: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 24 }}>Register as Member</h3>
                                <p style={{ margin: 0, color: 'var(--tea-muted)' }}>
                                    Join our FREE membership to unlock exclusive deals and discounts.
                                </p>
                                <button
                                    onClick={() => navigate('/register')}
                                    style={{ ...primaryButtonStyle, padding: '10px 18px' }}
                                >
                                    Join our FREE membership
                                </button>
                                <button
                                    onClick={onLogout}
                                    style={{ ...secondaryButtonStyle, padding: '10px 18px' }}
                                >
                                    Sign Out
                                </button>
                            </section>
                        )
                    ) : (
                        <>
                            <section className="order-page__intro">
                                <h2>Bubble Tea Shop</h2>
                                <p>
                                    Welcome back! Sign in to access your saved orders or jump right into
                                    guest checkout.
                                </p>
                            </section>

                            <section style={{ ...cardStyle, display: 'grid', gap: 16 }}>
                                
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 24 }}>
                                        Member Log in
                                    </h3>
                                </div>
                                <form onSubmit={onLoginSubmit} style={{ display: 'grid', gap: 16 }}>
                                    <label style={labelStyle}>
                                        Email
                                        <input
                                            type="email"
                                            name="email"
                                            value={loginForm.email}
                                            onChange={onLoginChange}
                                            required
                                            style={inputStyle}
                                        />
                                    </label>
                                    <label style={labelStyle}>
                                        Password
                                        <input
                                            type="password"
                                            name="password"
                                            value={loginForm.password}
                                            onChange={onLoginChange}
                                            required
                                            style={inputStyle}
                                        />
                                    </label>
                                    {statusMessage && (
                                        <div style={{ color: '#dc2626', fontSize: 14 }}>
                                            {statusMessage}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        style={{ ...primaryButtonStyle, padding: '10px 18px' }}
                                    >
                                        Log in
                                    </button>
                                </form>
                                <div
                                        style={{
                                            display: 'grid',
                                            gap: 8,
                                            textAlign: 'center',
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.72)',
                                            borderRadius: 12,
                                            border: '1px dashed #cbd5f5',
                                        }}
                                    >
                                        <p style={{ margin: 0, color: 'var(--tea-muted)', fontSize: 15 }}>
                                            Not a member?
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/register')}
                                            style={{
                                                ...secondaryButtonStyle,
                                                padding: '10px 18px',
                                                fontSize: 15,
                                            }}
                                        >
                                            Join our FREE membership
                                        </button>
                                        <p style={{ margin: 0, color: 'var(--tea-muted)', fontSize: 14 }}>
                                            Unlock exclusive deals and discounts.
                                        </p>
                                    </div>
                                <div
                                    style={{
                                        ...cardStyle,
                                        textAlign: 'center',
                                        display: 'grid',
                                        gap: 12,
                                    }}
                                >
                                    <h3 style={{ margin: 0, fontSize: 24 }}>Continue as guest</h3>
                                    <p style={{ margin: 0, color: 'var(--tea-muted)' }}>
                                        Skip the sign-in and start building your order right away.
                                    </p>
                                    <button
                                        onClick={onGuestCheckout}
                                        style={{
                                            ...primaryButtonStyle,
                                            padding: '10px 18px',
                                            fontSize: 16,
                                        }}
                                    >
                                        Continue as guest
                                    </button>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

function CustomerAccountPage({ user, onLogout, navigate }) {
    const [rewardData, setRewardData] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        // Load rewards data
        fetch("/api/v1/rewards", { headers })
            .then(response => response.json())
            .then(data => {
                setRewardData(data);
            })
            .catch(err => console.log("Could not load rewards:", err));

        // Load recent orders
        fetch("/api/v1/orders", { headers })
            .then(response => response.json())
            .then(data => {
                const orders = data.order_items || [];
                setRecentOrders(orders.slice(0, 3)); // Show last 3 orders
            })
            .catch(err => console.log("Could not load orders:", err))
            .finally(() => setIsLoading(false));
    }, []);

    const memberSince = user?.created_at 
        ? new Date(user.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
        : 'Unknown';

    const drinkCount = rewardData?.drink_count || 0;
    const availableRewards = rewardData?.available_rewards || {};
    const freeDrinks = availableRewards.free_drink || 0;
    const freeAddons = availableRewards.free_addon || 0;

    return (
        <div style={{ display: 'grid', gap: 24, maxWidth: 600, margin: '0 auto' }}>
            {/* Welcome Header */}
            <div style={{
                background: 'linear-gradient(135deg, var(--tea-primary), var(--tea-secondary))',
                color: 'white',
                padding: 24,
                borderRadius: 12,
                textAlign: 'center'
            }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: 28 }}>
                    Welcome back, {user?.full_name || user?.username || 'Member'}! 👋
                </h2>
                <p style={{ margin: 0, opacity: 0.9 }}>
                    Member since {memberSince}
                </p>
            </div>

            {/* Account Info & Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Account Details */}
                <div style={{ ...cardStyle, padding: 20 }}>
                    <h3 style={{ margin: '0 0 16px 0', color: 'var(--tea-primary)' }}>
                        📧 Account Details
                    </h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <div>
                            <strong>Email:</strong>
                            <br />
                            <span style={{ color: 'var(--tea-muted)' }}>
                                {user?.email || 'Not provided'}
                            </span>
                        </div>
                        <div>
                            <strong>Username:</strong>
                            <br />
                            <span style={{ color: 'var(--tea-muted)' }}>
                                {user?.username || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Loyalty Stats */}
                <div style={{ ...cardStyle, padding: 20 }}>
                    <h3 style={{ margin: '0 0 16px 0', color: 'var(--tea-primary)' }}>
                        🏆 Loyalty Status
                    </h3>
                    {isLoading ? (
                        <p style={{ margin: 0, color: 'var(--tea-muted)' }}>Loading...</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div>
                                <strong>Total Drinks:</strong>
                                <br />
                                <span style={{ color: 'var(--tea-secondary)', fontSize: 20, fontWeight: 'bold' }}>
                                    {drinkCount}
                                </span>
                            </div>
                            <div>
                                <strong>Available Rewards:</strong>
                                <br />
                                <span style={{ color: 'var(--tea-muted)' }}>
                                    {freeDrinks > 0 ? `🥤 ${freeDrinks} free drink${freeDrinks > 1 ? 's' : ''}` : ''}
                                    {freeDrinks > 0 && freeAddons > 0 ? ', ' : ''}
                                    {freeAddons > 0 ? `🧋 ${freeAddons} free addon${freeAddons > 1 ? 's' : ''}` : ''}
                                    {freeDrinks === 0 && freeAddons === 0 ? 'None available' : ''}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Orders */}
            <div style={{ ...cardStyle, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--tea-primary)' }}>
                    📋 Recent Orders
                </h3>
                {isLoading ? (
                    <p style={{ margin: 0, color: 'var(--tea-muted)' }}>Loading orders...</p>
                ) : recentOrders.length > 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {recentOrders.map((order, index) => (
                            <div key={order.id || index} style={{
                                padding: 12,
                                background: 'var(--tea-bg-light)',
                                borderRadius: 8,
                                borderLeft: '4px solid var(--tea-secondary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong>{order.item_name}</strong>
                                        {order.qty > 1 && <span style={{ color: 'var(--tea-muted)' }}> x{order.qty}</span>}
                                        <br />
                                        <small style={{ color: 'var(--tea-muted)' }}>
                                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recent'}
                                        </small>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ 
                                            color: order.status === 'complete' ? 'var(--tea-success)' : 'var(--tea-warning)',
                                            fontSize: 12,
                                            fontWeight: 'bold',
                                            textTransform: 'capitalize'
                                        }}>
                                            {order.status || 'Pending'}
                                        </div>
                                        <div style={{ color: 'var(--tea-primary)', fontWeight: 'bold' }}>
                                            ${(order.total_price || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => navigate('/past-orders')}
                            style={{
                                ...secondaryButtonStyle,
                                padding: '8px 16px',
                                marginTop: 8
                            }}
                        >
                            View All Orders
                        </button>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ margin: '0 0 16px 0', color: 'var(--tea-muted)' }}>
                            No orders yet! Start by browsing our menu.
                        </p>
                        <button
                            onClick={() => navigate('/menu')}
                            style={{ ...primaryButtonStyle, padding: '10px 18px' }}
                        >
                            Browse Menu
                        </button>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <button
                    onClick={() => navigate('/menu')}
                    style={{ ...primaryButtonStyle, padding: '12px 20px' }}
                >
                    🛒 Order Now
                </button>
                <button
                    onClick={() => navigate('/rewards')}
                    style={{ ...secondaryButtonStyle, padding: '12px 20px' }}
                >
                    🎁 View Rewards
                </button>
            </div>

            {/* Sign Out */}
            <button
                onClick={onLogout}
                style={{
                    ...cardStyle,
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '2px solid var(--tea-muted)',
                    color: 'var(--tea-muted)',
                    cursor: 'pointer',
                    textAlign: 'center'
                }}
            >
                Sign Out
            </button>
        </div>
    );
}


