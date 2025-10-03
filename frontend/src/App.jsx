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
import AnalyticsPage from "./components/AnalyticsPage.jsx";
import PastOrdersPage from "./components/PastOrdersPage.jsx";

const CUSTOMER_NAVIGATION = [
    { to: "/order", label: "Member Log In" },
    { to: "/menu", label: "Menu" },
    { to: "/cart", label: "Order" },
    { to: "/order-summary", label: "Order Summary" },
    { to: "/past-orders", label: "Past Orders", requiresAuth: true },
];

const STAFF_NAVIGATION = [
    { to: "/", label: "Home" },
    { to: "/orders", label: "Current Orders" },
    { to: "/analytics", label: "Analytics" },
    { to: "/admin", label: "Inventory" },
    { to: "/scheduling", label: "Schedule" },
];

const EMPTY_LOGIN = { email: "", password: "" };

const normalizeRole = value => (typeof value === "string" ? value.toLowerCase() : "");

const safePath = () => {
    if (typeof window === "undefined" || !window.location?.pathname) {
        return "/";
    }
    return window.location.pathname || "/";
};

const tempId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getNavigationForRole = role => {
    const normalized = normalizeRole(role);
    if (normalized === "staff" || normalized === "manager") {
        return STAFF_NAVIGATION;
    }
    return CUSTOMER_NAVIGATION;
};

const loadStoredUser = () => {
    if (typeof window === "undefined") {
        return null;
    }
    try {
        const raw = window.localStorage.getItem("jwt_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export default function App() {
    const [currentPath, setCurrentPath] = useState(safePath);
    const [health, setHealth] = useState(null);
    const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
    const [token, setToken] = useState(() => localStorage.getItem("jwt") || "");
    const [user, setUser] = useState(loadStoredUser);
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
        if (typeof window === "undefined") {
            return;
        }
        if (!token) {
            window.localStorage.removeItem("jwt");
            setUser(null);
            return;
        }

        window.localStorage.setItem("jwt", token);
    }, [token]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        if (!user) {
            window.localStorage.removeItem("jwt_user");
            return;
        }
        try {
            window.localStorage.setItem("jwt_user", JSON.stringify(user));
        } catch {
            // ignore serialization issues
        }
    }, [user]);

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
        setUser(null);
        setDashboardData(null);

        fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginForm),
        })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error("Log-in details are incorrect. Please try again.");
                }
                return data;
            })
            .then(data => {
                const profile = {
                    full_name: data.full_name || loginForm.email || "",
                    role: data.role || "customer",
                    account_type: data.account_type || "member",
                    email: loginForm.email || "",
                };
                setToken(data.access_token || "");
                setUser(profile);
                setStatusMessage(nextPath ? "Login successful. Let's build your drink." : "Login successful.");
                setLoginForm(EMPTY_LOGIN);
                if (nextPath) {
                    navigate(nextPath);
                }
            })
            .catch(error => setStatusMessage(error.message || "Log-in details are incorrect. Please try again."));
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
        setUser(null);
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
        let url = "/api/orders";
        if (!token) {
            const lookupIds = recentOrderItems
                .map(item => {
                    const identifier = item?.id;
                    if (identifier === undefined || identifier === null) {
                        return "";
                    }
                    return String(identifier).trim();
                })
                .filter(Boolean);
            if (lookupIds.length > 0) {
                const params = new URLSearchParams();
                params.set("ids", lookupIds.join(","));
                url += `?${params.toString()}`;
            }
        }

        fetch(url, { headers })
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
                const remainingIds = new Set(collection.map(item => item.id));
                setRecentOrderItems(previous =>
                    previous
                        .filter(orderItem => remainingIds.has(orderItem.id))
                        .map(orderItem => {
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
        const label = (endpoint || "dashboard").toString();
        const message = `Dashboard data (${label}) is not available.`;
        setDashboardData({ message, available_actions: [] });
        setStatusMessage(message);
    };

    const viewerRole = normalizeRole(user?.role) || "customer";
    const isStaffSignedIn = Boolean(isAuthenticated && (viewerRole === "staff" || viewerRole === "manager"));
    const hideNavigationOnHome = currentPath === "/" && !isStaffSignedIn;
    const navigationLinks = hideNavigationOnHome
        ? []
        : getNavigationForRole(viewerRole).filter(link => !link.requiresAuth || isAuthenticated);

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
                    statusMessage={statusMessage}
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
        case "/analytics":
            return <AnalyticsPage system={systemProps} session={sessionProps} />;
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
        case "/past-orders":
            return (
                <PastOrdersPage
                    system={systemProps}
                    session={sessionProps}
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
