import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPage from './components/AdminPage.jsx';
import HomePage from './components/HomePage.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';
import OrderPage from './components/OrderPage.jsx';

const NAVIGATION_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/order', label: 'Order' },
    { to: '/admin', label: 'Admin' },
];

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

    const systemProps = useMemo(
        () => ({
            title: 'Restaurant Management',
            health,
            statusMessage,
            currentPath,
            navigate,
            navigation: NAVIGATION_LINKS,
        }),
        [health, statusMessage, currentPath, navigate],
    );

    const sessionProps = useMemo(
        () => ({
            isAuthenticated,
            user,
            onLoadDashboard: loadDashboard,
            dashboardData,
            statusMessage,
        }),
        [isAuthenticated, user, dashboardData, statusMessage],
    );

    const renderPage = () => {
        switch (currentPath) {
            case '/order':
                return (
                    <OrderPage
                        system={systemProps}
                        session={sessionProps}
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
                        system={systemProps}
                        session={sessionProps}
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
                return <HomePage system={systemProps} session={sessionProps} navigate={navigate} />;
            default:
                return <NotFoundPage system={systemProps} session={sessionProps} navigate={navigate} />;
        }
    };

    return renderPage();
}
