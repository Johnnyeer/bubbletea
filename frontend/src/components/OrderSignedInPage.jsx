import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from './styles.js';

export default function OrderSignedInPage({ user, navigate, onLogout }) {
    const name = user?.full_name || user?.username || user?.email || 'Member';

    return (
        <div className="order-page signed-in">
            <main className="order-page__main">
                <div className="order-page__inner">
                    <section style={{ ...cardStyle, display: 'grid', gap: 12 }}>
                        <h2 style={{ margin: 0 }}>Welcome back, {name}!</h2>
                        <p style={{ margin: 0, color: 'var(--tea-muted)' }}>
                            You're signed in. Continue to the menu to build a new order or view
                            your recent orders.
                        </p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            <button
                                type="button"
                                onClick={() => navigate('/menu')}
                                style={{ ...primaryButtonStyle, padding: '10px 18px' }}
                            >
                                Start order
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/order-summary')}
                                style={{ ...secondaryButtonStyle, padding: '10px 18px' }}
                            >
                                Recent orders
                            </button>
                            <button
                                type="button"
                                onClick={() => onLogout && onLogout()}
                                style={{ ...secondaryButtonStyle, padding: '10px 18px' }}
                            >
                                Sign out
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
