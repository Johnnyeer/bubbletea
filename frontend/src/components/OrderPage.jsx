import SessionPanel from './SessionPanel.jsx';
import SystemLayout from './SystemLayout.jsx';
import {
    cardStyle,
    inputStyle,
    labelStyle,
    primaryButtonStyle,
    secondaryButtonStyle, // ✅ added
} from './styles.js';

export default function OrderPage({
                                      system,
                                      session,
                                      navigate,
                                      loginForm,
                                      onLoginChange,
                                      onLoginSubmit,
                                      onGuestCheckout,
                                  }) {
    const sessionFooter = session ? <SessionPanel {...session} /> : null;

    return (
        <SystemLayout system={system} footer={sessionFooter}>
            <section
                style={{
                    display: 'grid',
                    gap: 24,
                    maxWidth: 640,
                    margin: '0 auto',
                    textAlign: 'left',
                }}
            >
                <div style={{ display: 'grid', gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 32, textAlign: 'center' }}>
                        Restaurant
                    </h2>
                    <p style={{ margin: 0, color: '#4a5568', textAlign: 'center' }}>
                        Welcome back! Sign in to access your saved orders or jump right into
                        guest checkout.
                    </p>
                    <div style={{ textAlign: 'center' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/admin')}
                            style={{
                                ...secondaryButtonStyle,
                                marginTop: 8,
                                padding: '8px 18px',
                                fontWeight: 600,
                            }}
                        >
                            Staff &amp; manager portal
                        </button>
                    </div>
                </div>

                <div style={{ ...cardStyle, display: 'grid', gap: 16 }}>
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
                    <p style={{ margin: 0, color: '#4a5568', fontSize: 15 }}>
                        Not a member? <strong>Join our FREE membership today</strong> to
                        unlock exclusive deals and discounts.
                    </p>
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
                </div>
            </section>
        </SystemLayout>
    );
}
