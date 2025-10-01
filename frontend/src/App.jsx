import { useEffect, useState } from "react";
import AdminPage from "./components/AdminPage.jsx";
import NotFoundPage from "./components/NotFoundPage.jsx";
import OrderPage from "./components/OrderPage.jsx";
import RegisterPage from "./components/RegisterPage.jsx";
import MenuSelectionPage from "./components/MenuSelectionPage.jsx";
import CartPage from "./components/CartPage.jsx";
import OrderSummaryPage from "./components/OrderSummaryPage.jsx";
import SchedulingPage from "./components/SchedulingPage.jsx";
import CurrentOrdersPage from "./components/CurrentOrdersPage.jsx";

const CUSTOMER_NAVIGATION = [
    { to: "/order", label: "Member Log In" },
    { to: "/menu", label: "Menu" },
    { to: "/cart", label: "Order" },
    { to: "/order-summary", label: "Order Summary" },
];

const STAFF_NAVIGATION = [
    { to: "/", label: "Home" },
    { to: "/orders", label: "Current Orders" },
    { to: "/admin", label: "Inventory" },
    { to: "/scheduling", label: "Schedule" },
];

const EMPTY_LOGIN = { email: "", password: "" };

const safePath = () => {
    if (typeof window === "undefined" || !window.location?.pathname) {
        return "/";
    }
    return window.location.pathname || "/";
};

const tempId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getNavigationForRole = role => {
    if (role === "staff" || role === "manager") {
        return STAFF_NAVIGATION;
    }
    return CUSTOMER_NAVIGATION;
};

export default function App() {
    const [currentPath, setCurrentPath] = useState(safePath);
    const [health, setHealth] = useState(null);
    const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
    const [token, setToken] = useState(() => localStorage.getItem("jwt") || "");
    const [user, setUser] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [dashboardData, setDashboardData] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [recentOrderItems, setRecentOrderItems] = useState([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

    useEffect(() => {
        fetch("/api/health")
            .then(response => response.json())
            .then(setHealth)
            .catch(() => setHealth({ status: "unknown" }));
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }
        const handlePopState = () => setCurrentPath(safePath());
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    useEffect(() => {
        if (!token) {
            localStorage.removeItem("jwt");
            setUser(null);
            return;
        }

        localStorage.setItem("jwt", token);
        fetch("/api/me", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(async response => {
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Unable to load profile");
                }
                return response.json();
            })
            .then(profile => {
                setUser(profile);
                setStatusMessage("");
            })
            .catch(error => {
                console.error(error);
                setStatusMessage(error.message);
                setToken("");
            });
    }, [token]);

    const isAuthenticated = Boolean(token && user);

    const navigate = path => {
        if (typeof window === "undefined" || path === currentPath) {
            return;
        }
        window.history.pushState({}, "", path);
        setCurrentPath(path);
        window.scrollTo(0, 0);
    };

    const handleLoginChange = event => {
        const { name, value } = event.target;
        setLoginForm(previous => ({ ...previous, [name]: value }));
    };

    const handleLoginSubmit = (event, nextPath) => {
        event.preventDefault();
        setStatusMessage("Signing in...");
        setDashboardData(null);

        fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginForm),
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Login failed");
                }
                return data;
            })
            .then(data => {
                setToken(data.access_token || "");
                setStatusMessage(nextPath ? "Login successful. Let's build your drink." : "Login successful.");
                setLoginForm(EMPTY_LOGIN);
                if (nextPath) {
                    navigate(nextPath);
                }
            })
            .catch(error => setStatusMessage(error.message || "Login failed"));
    };

    const handleOrderLoginSubmit = event => handleLoginSubmit(event, "/menu");

    const handleLogout = () => {
        setToken("");
        setDashboardData(null);
        setStatusMessage("Signed out.");
        setRecentOrderItems([]);
    };

    const handleGuestCheckout = () => {
        setToken("");
        setDashboardData(null);
        setStatusMessage("Guest mode enabled. Browse the menu and build your order.");
        navigate("/menu");
    };

    const handleAddItemToCart = item => {
        setCartItems(previous => [
            ...previous,
            {
                ...item,
                id: tempId(),
            },
        ]);
        navigate("/cart");
    };

    const handleCheckout = () => {
        if (cartItems.length === 0 || isSubmittingOrder) {
            return;
        }
        setIsSubmittingOrder(true);
        setStatusMessage("Submitting your order...");

        const headers = { "Content-Type": "application/json" };
        if (token) {
            headers.Authorization = "Bearer " + token;
        }

        fetch("/api/orders", {
            method: "POST",
            headers,
            body: JSON.stringify({ items: cartItems }),
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Unable to place order");
                }
                return data;
            })
            .then(data => {
                const items = Array.isArray(data.order_items) ? data.order_items : [];
                setRecentOrderItems(items);
                setStatusMessage("Order placed!");
                setCartItems([]);
                navigate("/order-summary");
            })
            .catch(error => {
                console.error(error);
                setStatusMessage(error.message || "Unable to place order");
            })
            .finally(() => setIsSubmittingOrder(false));
    };

    const refreshRecentOrderStatuses = () => {
        if (recentOrderItems.length === 0) {
            return;
        }
        setIsRefreshingOrders(true);
        const headers = token ? { Authorization: "Bearer " + token } : {};

        fetch("/api/orders", { headers })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Unable to refresh order status");
                }
                return data;
            })
            .then(data => {
                const collection = Array.isArray(data.order_items) ? data.order_items : [];
                const lookup = new Map(collection.map(item => [item.id, item]));
                setRecentOrderItems(previous =>
                    previous.map(orderItem => {
                        const update = lookup.get(orderItem.id);
                        if (!update) {
                            return orderItem;
                        }
                        return {
                            ...orderItem,
                            status: update.status,
                            total_price: update.total_price,
                            created_at: update.created_at ?? orderItem.created_at,
                        };
                    }),
                );
            })
            .catch(error => {
                console.error(error);
                setStatusMessage(error.message || "Unable to refresh order status");
            })
            .finally(() => setIsRefreshingOrders(false));
    };

    const handleCreateTeamAccount = async payload => {
        if (!token) {
            const message = "Sign in as a manager to create staff accounts.";
            setStatusMessage(message);
            throw new Error(message);
        }
        setStatusMessage("Creating team account...");
        const response = await fetch("/api/admin/accounts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = data.error || "Unable to create account";
            setStatusMessage(message);
            throw new Error(message);
        }
        setStatusMessage(`Account created for ${data.full_name}.`);
        return data;
    };

    const loadDashboard = endpoint => {
        if (!token) {
            return;
        }
        setStatusMessage("Loading dashboard...");
        fetch(`/api/dashboard/${endpoint}`, {
            headers: { Authorization: "Bearer " + token },
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Unable to load dashboard");
                }
                return data;
            })
            .then(data => {
                setDashboardData(data);
                setStatusMessage("");
            })
            .catch(error => {
                setStatusMessage(error.message || "Unable to load dashboard");
                setDashboardData(null);
            });
    };

    const viewerRole = user?.role || "customer";
    const isStaffSignedIn = Boolean(isAuthenticated && (viewerRole === "staff" || viewerRole === "manager"));
    const hideNavigationOnHome = currentPath === "/" && !isStaffSignedIn;
    const navigationLinks = hideNavigationOnHome ? [] : getNavigationForRole(viewerRole);

    const systemProps = {
        title: "Bubble Tea Shop",
        health,
        statusMessage,
        currentPath,
        navigate,
        navigation: navigationLinks,
        onStatusMessage: setStatusMessage,
    };

    const sessionProps = {
        isAuthenticated,
        user,
        onLoadDashboard: loadDashboard,
        dashboardData,
        statusMessage,
        token,
    };

    switch (currentPath) {
        case "/order":
            return (
                <OrderPage
                    navigate={navigate}
                    loginForm={loginForm}
                    onLoginChange={handleLoginChange}
                    onLoginSubmit={handleOrderLoginSubmit}
                    onGuestCheckout={handleGuestCheckout}
                />
            );
        case "/menu":
            return (
                <MenuSelectionPage
                    system={systemProps}
                    navigate={navigate}
                    onAddToCart={handleAddItemToCart}
                />
            );
        case "/register":
            return <RegisterPage navigate={navigate} />;
        case "/cart":
            return (
                <CartPage
                    system={systemProps}
                    cartItems={cartItems}
                    navigate={navigate}
                    onCheckout={handleCheckout}
                    isCheckingOut={isSubmittingOrder}
                />
            );
        case "/scheduling":
            return (
                <SchedulingPage
                    system={systemProps}
                    session={sessionProps}
                    navigate={navigate}
                    token={token}
                    onStatusMessage={setStatusMessage}
                />
            );
        case "/orders":
            return <CurrentOrdersPage system={systemProps} session={sessionProps} />;
        case "/order-summary":
            return (
                <OrderSummaryPage
                    system={systemProps}
                    orderItems={recentOrderItems}
                    navigate={navigate}
                    onRefresh={refreshRecentOrderStatuses}
                    isRefreshing={isRefreshingOrders}
                />
            );
        case "/admin":
        case "/":
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
                    onCreateTeamAccount={handleCreateTeamAccount}
                />
            );
        default:
            return <NotFoundPage system={systemProps} navigate={navigate} />;
    }
}
