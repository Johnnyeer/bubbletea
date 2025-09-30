export default function OrderPage({ navigate, loginForm, onLoginChange, onLoginSubmit, onGuestCheckout }) {
    return (
        <section style={{ maxWidth: '40rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2>Order</h2>
                <p>Sign in if you have an account or continue as a guest to start an order.</p>
                <button type="button" onClick={() => navigate('/admin')} style={{ marginTop: '0.5rem' }}>
                    Go to the admin portal
                </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <h3>Member log in</h3>
                <form onSubmit={onLoginSubmit}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>
                            Email or phone
                            <br />
                            <input
                                type="text"
                                name="email"
                                value={loginForm.email}
                                onChange={onLoginChange}
                                required
                                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
                            />
                        </label>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>
                            Password
                            <br />
                            <input
                                type="password"
                                name="password"
                                value={loginForm.password}
                                onChange={onLoginChange}
                                required
                                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
                            />
                        </label>
                    </div>
                    <button type="submit">Log in</button>
                </form>
            </div>

            <div>
                <h3>Continue as guest</h3>
                <p>You can look through the menu and place an order without signing in.</p>
                <button type="button" onClick={onGuestCheckout}>
                    Continue as guest
                </button>
            </div>
        </section>
    );
}