import { useCallback, useEffect, useMemo, useState } from 'react';

const initialLoginState = {
    email: '',
    password: '',
};

export default function App() {
    const getInitialPath = () => {
        if (typeof window === 'undefined' || !window.location?.pathname) {
            return '/';
        }
        return window.location.pathname || '/';
    };

    const [health, setHealth] = useState(null);
    const [loginForm, setLoginForm] = useState(initialLoginState);
    const [token, setToken] = useState(() => localStorage.getItem('jwt') || '');
    const [user, setUser] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
    const [currentPath, setCurrentPath] = useState(getInitialPath);

    useEffect(() => {
        fetch('/api/health').then(r => r.json()).then(setHealth).catch(console.error);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        const handlePopState = () => {
            setCurrentPath(getInitialPath());
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigate = useCallback(
        path => {
            if (typeof window === 'undefined') {
                return;
            }
            if (path === currentPath) {
                return;
            }
            window.history.pushState({}, '', path);
            setCurrentPath(path);
            window.scrollTo(0, 0);
        },
        [currentPath],
    );

    useEffect(() => {
        if (token) {
            localStorage.setItem('jwt', token);
            fetch('/api/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(async response => {
                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(err.error || 'Unable to load profile');
                    }
                    return response.json();
                })
                .then(data => {
                    setUser(data);
                    setStatusMessage('');
                })
                .catch(error => {
                    console.error(error);
                    setStatusMessage(error.message);
                    setToken('');
                });
        } else {
            localStorage.removeItem('jwt');
            setUser(null);
        }
    }, [token]);

    const isAuthenticated = useMemo(() => Boolean(token && user), [token, user]);

    const handleLoginChange = event => {
        const { name, value } = event.target;
        setLoginForm(prev => ({ ...prev, [name]: value }));
    };

    const handleLoginSubmit = event => {
        event.preventDefault();
        setStatusMessage('Signing in…');
        setDashboardData(null);
        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginForm),
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }
                setToken(data.access_token || '');
                setStatusMessage('Login successful.');
                setLoginForm(initialLoginState);
            })
            .catch(error => setStatusMessage(error.message));
    };

    const handleLogout = () => {
        setToken('');
        setDashboardData(null);
        setStatusMessage('Signed out.');
    };

    const handleGuestCheckout = () => {
        setToken('');
        setDashboardData(null);
        setStatusMessage('Guest mode enabled. Browse the menu and build your order.');
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    };

    const loadDashboard = endpoint => {
        if (!token) return;
        setStatusMessage('Loading dashboard…');
        fetch(`/api/dashboard/${endpoint}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || 'Unable to load dashboard');
                }
                setDashboardData(data);
                setStatusMessage('');
            })
            .catch(error => {
                setStatusMessage(error.message);
                setDashboardData(null);
            });
    };
    const renderPage = () => {
        switch (currentPath) {
            case '/order':
                return (
                    <OrderPage
                        navigate={navigate}
                        loginForm={loginForm}
                        onLoginChange={handleLoginChange}
                        onLoginSubmit={handleLoginSubmit}
                        onGuestCheckout={handleGuestCheckout}
                    />
                );
            case '/admin':
                return (
                    <AdminPage
                        loginForm={loginForm}
                        onLoginChange={handleLoginChange}
                        onLoginSubmit={handleLoginSubmit}
                        onLogout={handleLogout}
                        isAuthenticated={isAuthenticated}
                        user={user}
                        navigate={navigate}
                    />
                );
            case '/':
                return <HomePage navigate={navigate} />;
            default:
                return <NotFoundPage navigate={navigate} />;
        }
    };

    return (
        <div style={{ fontFamily: 'system-ui', minHeight: '100vh', background: '#fafafa', color: '#222' }}>
            <header
                style={{
                    padding: '20px 16px',
                    borderBottom: '1px solid #e5e5e5',
                    background: '#fff',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Restaurant Management</h1>
                        <p style={{ margin: 0, color: '#555' }}>Backend health: {health ? health.status : '…'}</p>
                    </div>
                    <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <NavigationLink to="/" navigate={navigate} currentPath={currentPath}>
                            Home
                        </NavigationLink>
                        <NavigationLink to="/order" navigate={navigate} currentPath={currentPath}>
                            Order
                        </NavigationLink>
                        <NavigationLink to="/admin" navigate={navigate} currentPath={currentPath}>
                            Admin
                        </NavigationLink>
                    </nav>
                </div>
                {statusMessage && (
                    <div
                        style={{
                            marginTop: 12,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: '#f0f7ff',
                            border: '1px solid #c3ddff',
                            color: '#06418d',
                            fontSize: 14,
                        }}
                    >
                        {statusMessage}
                    </div>
                )}
            </header>

            <main style={{ padding: '24px 16px', maxWidth: 960, margin: '0 auto' }}>{renderPage()}</main>

            <footer style={{ padding: '24px 16px', borderTop: '1px solid #e5e5e5', background: '#fff' }}>
                <SessionPanel
                    isAuthenticated={isAuthenticated}
                    user={user}
                    onLoadDashboard={loadDashboard}
                    dashboardData={dashboardData}
                    statusMessage={statusMessage}
                />
            </footer>
        </div>
    );
}

function NavigationLink({ to, navigate, currentPath, children }) {
    const handleClick = event => {
        event.preventDefault();
        navigate(to);
    };

    const isActive = currentPath === to;

    return (
        <a
            href={to}
            onClick={handleClick}
            style={{
                padding: '6px 10px',
                borderRadius: 6,
                textDecoration: 'none',
                color: isActive ? '#0b5ed7' : '#1f2933',
                background: isActive ? 'rgba(11, 94, 215, 0.08)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
            }}
        >
            {children}
        </a>
    );
}

function HomePage({ navigate }) {
    return (
        <section style={{ display: 'grid', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)' }}>
                <h2 style={{ marginTop: 0 }}>Welcome to Bubbletea HQ</h2>
                <p style={{ marginTop: 8, color: '#4a5568' }}>
                    Manage your tea shop from one place. Customers can place orders, while staff and managers oversee
                    operations, team performance, and menu updates.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                    <button onClick={() => navigate('/order')} style={primaryButtonStyle}>
                        Start an order
                    </button>
                    <button onClick={() => navigate('/admin')} style={secondaryButtonStyle}>
                        Staff &amp; manager portal
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <InfoCard title="Customers" description="Build orders, track favorites, and check out as a guest or registered member." />
                <InfoCard title="Staff" description="View order queues, mark drinks complete, and keep inventory in sync." />
                <InfoCard title="Managers" description="Review team performance, update menus, and access high-level dashboards." />
            </div>
        </section>
    );
}

function OrderPage({ navigate, loginForm, onLoginChange, onLoginSubmit, onGuestCheckout }) {
    return (
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
                <h2 style={{ margin: 0, fontSize: 32, textAlign: 'center' }}>Restaurant</h2>
                <p style={{ margin: 0, color: '#4a5568', textAlign: 'center' }}>
                    Welcome back! Sign in to access your saved orders or jump right into guest checkout.
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
                    <button type="submit" style={{ ...primaryButtonStyle, padding: '10px 18px' }}>
                        Log in
                    </button>
                </form>
                <p style={{ margin: 0, color: '#4a5568', fontSize: 15 }}>
                    Not a member? <strong>Join our FREE membership today</strong> to unlock exclusive deals and discounts.
                </p>
            </div>

            <div style={{ ...cardStyle, textAlign: 'center', display: 'grid', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 24 }}>Continue as guest</h3>
                <p style={{ margin: 0, color: '#4a5568' }}>Skip the sign-in and start building your order right away.</p>
                <button onClick={onGuestCheckout} style={{ ...primaryButtonStyle, padding: '10px 18px', fontSize: 16 }}>
                    Continue as guest
                </button>
            </div>
        </section>
    );
}

function AdminPage({ loginForm, onLoginChange, onLoginSubmit, onLogout, isAuthenticated, user, navigate }) {
    return (
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
    );
}

function SessionPanel({ isAuthenticated, user, onLoadDashboard, dashboardData, statusMessage }) {
    return (
        <section style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
            <div>
                <h2 style={{ margin: 0 }}>Session overview</h2>
                <p style={{ marginTop: 4, color: '#4a5568' }}>Status message: {statusMessage || 'None'}</p>
            </div>
            {isAuthenticated ? (
                <div style={{ border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: 12, padding: 20 }}>
                    <p style={{ margin: '0 0 6px 0' }}>
                        <strong>Name:</strong> {user.full_name}
                    </p>
                    <p style={{ margin: '0 0 6px 0' }}>
                        <strong>Email:</strong> {user.email}
                    </p>
                    <p style={{ margin: '0 0 12px 0' }}>
                        <strong>Role:</strong> {user.role}
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button onClick={() => onLoadDashboard('customer')} style={pillButtonStyle}>
                            Customer dashboard
                        </button>
                        {(user.role === 'staff' || user.role === 'manager') && (
                            <button onClick={() => onLoadDashboard('staff')} style={pillButtonStyle}>
                                Staff dashboard
                            </button>
                        )}
                        {user.role === 'manager' && (
                            <button onClick={() => onLoadDashboard('manager')} style={pillButtonStyle}>
                                Manager dashboard
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ border: '1px dashed #cbd5f5', borderRadius: 12, padding: 20, background: '#f8fafc' }}>
                    <p style={{ margin: 0, color: '#4a5568' }}>
                        You are not signed in. Visit the order or admin pages to log in and view dashboards.
                    </p>
                </div>
            )}

            {dashboardData && (
                <div style={{ border: '1px solid #bfdbfe', background: '#e0f2fe', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ marginTop: 0 }}>{dashboardData.message}</h3>
                    <ul style={{ margin: '12px 0 0 16px', color: '#1e3a8a' }}>
                        {dashboardData.available_actions?.map(action => (
                            <li key={action}>{action}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

function NotFoundPage({ navigate }) {
    return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h2 style={{ marginBottom: 16 }}>Page not found</h2>
            <p style={{ marginBottom: 24, color: '#4a5568' }}>
                The page you were looking for has moved. Try heading back to the home screen.
            </p>
            <button onClick={() => navigate('/')} style={primaryButtonStyle}>
                Back to home
            </button>
        </div>
    );
}

function InfoCard({ title, description }) {
    return (
        <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            <p style={{ marginTop: 8, color: '#4a5568' }}>{description}</p>
        </div>
    );
}

const cardStyle = {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
    border: '1px solid #e5e7eb',
};

const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    marginTop: 6,
};

const labelStyle = {
    display: 'grid',
    gap: 6,
    fontSize: 14,
    color: '#1f2933',
};

const primaryButtonStyle = {
    background: '#0b5ed7',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.16)',
};

const secondaryButtonStyle = {
    background: '#e0ecff',
    color: '#1e3a8a',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    fontWeight: 600,
};

const pillButtonStyle = {
    background: '#1d4ed8',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '6px 14px',
    cursor: 'pointer',
    fontWeight: 600,
};

const handleLink = (event, navigate, path) => {
    event.preventDefault();
    navigate(path);
};

