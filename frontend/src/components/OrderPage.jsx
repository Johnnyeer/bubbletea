import {
    cardStyle,
    inputStyle,
    labelStyle,
    primaryButtonStyle,
    secondaryButtonStyle,
} from './styles.js';

export default function OrderPage({
    navigate,
    loginForm,
    onLoginChange,
    onLoginSubmit,
    onGuestCheckout,
}) {
    return (
        <div className="order-page">
            <main className="order-page__main">
                <div className="order-page__inner">
                    <section className="order-page__intro">
                        <h2>Restaurant</h2>
                        <p>
                            Welcome back! Sign in to access your saved orders or jump right into
                            guest checkout.
                        </p>
                    </section>

                    <section style={{ ...cardStyle, display: 'grid', gap: 16 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 24 }}>Member Log in</h3>
                        </div>
                        <form onSubmit={onLoginSubmit} style={{ display: 'grid', gap: 16 }}>
                            <label style={labelStyle}>
                                Email/Phone Number
                                <input
                                    type="text"
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
                                background: '#f8fafc',
                                borderRadius: 12,
                                border: '1px dashed #cbd5f5',
                            }}
                        >
                            <p style={{ margin: 0, color: '#4a5568', fontSize: 15 }}>Not a member?</p>
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
                            <p style={{ margin: 0, color: '#4a5568', fontSize: 14 }}>
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
                            <p style={{ margin: 0, color: '#4a5568' }}>
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
                </div>
            </main>
        </div>
    );
}
