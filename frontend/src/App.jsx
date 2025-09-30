import { useEffect, useMemo, useState } from 'react';

const initialRegisterState = {
    full_name: '',
    email: '',
    password: '',
    role: 'customer',
};

const initialLoginState = {
    email: '',
    password: '',
};

export default function App() {
    const [health, setHealth] = useState(null);
    const [registerForm, setRegisterForm] = useState(initialRegisterState);
    const [loginForm, setLoginForm] = useState(initialLoginState);
    const [token, setToken] = useState(() => localStorage.getItem('jwt') || '');
    const [user, setUser] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [dashboardData, setDashboardData] = useState(null);

    useEffect(() => {
        fetch('/api/health').then(r => r.json()).then(setHealth).catch(console.error);
    }, []);

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

    const handleRegisterChange = event => {
        const { name, value } = event.target;
        setRegisterForm(prev => ({ ...prev, [name]: value }));
    };

    const handleLoginChange = event => {
        const { name, value } = event.target;
        setLoginForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRegisterSubmit = event => {
        event.preventDefault();
        setStatusMessage('Creating account…');
        setDashboardData(null);
        fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerForm),
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }
                setStatusMessage('Registration successful. You can now sign in.');
                setRegisterForm(initialRegisterState);
            })
            .catch(error => setStatusMessage(error.message));
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

    return (
        <div style={{ fontFamily: 'system-ui', padding: 16, lineHeight: 1.5 }}>
            <h1>Restaurant Management</h1>
            <p>Backend health: {health ? health.status : '…'}</p>

            <section style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                    <h2>Register</h2>
                    <form onSubmit={handleRegisterSubmit} style={{ display: 'grid', gap: 12 }}>
                        <label>
                            Full name
                            <input
                                name="full_name"
                                value={registerForm.full_name}
                                onChange={handleRegisterChange}
                                required
                                style={{ width: '100%', padding: 8 }}
                            />
                        </label>
                        <label>
                            Email
                            <input
                                type="email"
                                name="email"
                                value={registerForm.email}
                                onChange={handleRegisterChange}
                                required
                                style={{ width: '100%', padding: 8 }}
                            />
                        </label>
                        <label>
                            Password
                            <input
                                type="password"
                                name="password"
                                value={registerForm.password}
                                onChange={handleRegisterChange}
                                required
                                style={{ width: '100%', padding: 8 }}
                            />
                        </label>
                        <label>
                            Role
                            <select
                                name="role"
                                value={registerForm.role}
                                onChange={handleRegisterChange}
                                style={{ width: '100%', padding: 8 }}
                            >
                                <option value="customer">Customer</option>
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                            </select>
                        </label>
                        <button type="submit" style={{ padding: '8px 12px' }}>Create account</button>
                    </form>
                </div>

                <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                    <h2>Login</h2>
                    <form onSubmit={handleLoginSubmit} style={{ display: 'grid', gap: 12 }}>
                        <label>
                            Email
                            <input
                                type="email"
                                name="email"
                                value={loginForm.email}
                                onChange={handleLoginChange}
                                required
                                style={{ width: '100%', padding: 8 }}
                            />
                        </label>
                        <label>
                            Password
                            <input
                                type="password"
                                name="password"
                                value={loginForm.password}
                                onChange={handleLoginChange}
                                required
                                style={{ width: '100%', padding: 8 }}
                            />
                        </label>
                        <button type="submit" style={{ padding: '8px 12px' }}>Sign in</button>
                    </form>
                    {isAuthenticated && (
                        <button onClick={handleLogout} style={{ marginTop: 12, padding: '6px 10px' }}>
                            Sign out
                        </button>
                    )}
                </div>
            </section>

            <section style={{ marginTop: 24 }}>
                <h2>Current session</h2>
                <p>Status message: {statusMessage || 'None'}</p>
                {isAuthenticated ? (
                    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginTop: 12 }}>
                        <p><strong>Name:</strong> {user.full_name}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Role:</strong> {user.role}</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                            <button onClick={() => loadDashboard('customer')}>Customer dashboard</button>
                            {(user.role === 'staff' || user.role === 'manager') && (
                                <button onClick={() => loadDashboard('staff')}>Staff dashboard</button>
                            )}
                            {user.role === 'manager' && (
                                <button onClick={() => loadDashboard('manager')}>Manager dashboard</button>
                            )}
                        </div>
                    </div>
                ) : (
                    <p>Sign in to access dashboards.</p>
                )}

                {dashboardData && (
                    <div style={{ border: '1px solid #cce5ff', background: '#f5fbff', padding: 16, borderRadius: 8, marginTop: 16 }}>
                        <h3>{dashboardData.message}</h3>
                        <ul>
                            {dashboardData.available_actions?.map(action => (
                                <li key={action}>{action}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </div>
    );
}

