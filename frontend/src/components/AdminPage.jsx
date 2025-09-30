import { cardStyle, inputStyle, labelStyle, primaryButtonStyle, secondaryButtonStyle } from './styles.js';
import SessionPanel from './SessionPanel.jsx';
import SystemLayout from './SystemLayout.jsx';

export default function AdminPage({
                                      system,
                                      session,
                                      loginForm,
                                      onLoginChange,
                                      onLoginSubmit,
                                      onLogout,
                                      isAuthenticated,
                                      user,
                                      navigate,
                                  }) {
    const sessionFooter = session ? <SessionPanel {...session} /> : null;

    return (
        <SystemLayout system={system} footer={sessionFooter}>
            <section style={{ display: 'grid', gap: 24 }}>
                <div style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>Staff &amp; manager sign in</h2>
                    <p style={{ marginTop: 8, color: '#4a5568' }}>
                        Monitor store performance, manage teams, and keep drinks flowing smoothly.
                    </p>
                    <form onSubmit={onLoginSubmit} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
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
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button type="submit" style={primaryButtonStyle}>
                                Sign in
                            </button>
                            {isAuthenticated && (
                                <button type="button" onClick={onLogout} style={secondaryButtonStyle}>
                                    Sign out
                                </button>
                            )}
                        </div>
                    </form>
                    <p style={{ marginTop: 16, fontSize: 14, color: '#4a5568' }}>
                        Taking or tracking an order?{' '}
                        <a href="/order" onClick={event => handleLink(event, navigate, '/order')} style={{ color: '#0b5ed7' }}>
                            Switch to the customer order page.
                        </a>
                    </p>
                </div>

                {isAuthenticated && user && (
                    <div style={{ ...cardStyle, background: '#f0f7ff' }}>
                        <h3 style={{ marginTop: 0 }}>Signed in as {user.full_name}</h3>
                        <p style={{ marginTop: 8, color: '#1e3a8a' }}>
                            Role: <strong>{user.role}</strong>
                        </p>
                        <p style={{ marginTop: 8, color: '#1e3a8a' }}>
                            Use the dashboard controls below to access staff or manager tools.
                        </p>
                    </div>
                )}
            </section>
        </SystemLayout>
    );
}

const handleLink = (event, navigate, path) => {
    event.preventDefault();
    navigate(path);
};