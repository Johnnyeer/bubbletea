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
import RewardPage from "./components/RewardPage.jsx";
import SystemLayout from "./components/SystemLayout.jsx";
import SessionSwitcher from "./components/SessionSwitcher.jsx";
import sessionManager from "./utils/sessionManager.js";
import { getThemeForRole, applyTheme } from "./themes.js";

const CUSTOMER_NAVIGATION = [
    { to: "/customer", label: "Member Log In" },
    { to: "/menu", label: "Menu" },
    { to: "/cart", label: "Cart" },
    { to: "/order-summary", label: "Order Summary" },
    { to: "/past-orders", label: "Past Orders", requiresAuth: true },
    { to: "/rewards", label: "Rewards", requiresAuth: true },
];

const STAFF_NAVIGATION = [
    { to: "/", label: "Home" },
    { to: "/orders", label: "Current Orders" },
    { to: "/analytics", label: "Analytics" },
    { to: "/inventory", label: "Inventory" },
    { to: "/schedule", label: "Schedule" },
];

const EMPTY_LOGIN = { email: "", username: "", password: "" };

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
    
    // Try to migrate old session data first
    sessionManager.migrateOldSession();
    
    // Get current user from session manager
    return sessionManager.getCurrentUser();
};

export default function App() {
    const [currentPath, setCurrentPath] = useState(safePath);
    const [health, setHealth] = useState(null);
    const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
    const [token, setToken] = useState(() => sessionManager.getCurrentToken() || "");
    const [user, setUser] = useState(loadStoredUser);
    const [statusMessage, setStatusMessage] = useState("");
    const [cartItems, setCartItems] = useState([]);
    const [recentOrderItems, setRecentOrderItems] = useState([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
    const [availableRewards, setAvailableRewards] = useState([]);

    useEffect(() => {
        fetch("/api/v1/health")
            .then(response => response.json())
            .then(setHealth)
            .catch(() => setHealth({ status: "unknown" }));
        
        // Initialize session manager and load current session
        const currentUser = sessionManager.getCurrentUser();
        const currentToken = sessionManager.getCurrentToken();
        
        if (currentUser && currentToken) {
            setUser(currentUser);
            setToken(currentToken);
            loadAvailableRewards(currentToken);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }
        const handlePopState = () => setCurrentPath(safePath());
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    // Apply theme based on current user role
    useEffect(() => {
        const userRole = user?.role || 'customer';
        const theme = getThemeForRole(userRole);
        applyTheme(theme);
    }, [user]);
    
    // Apply default customer theme on initial load
    useEffect(() => {
        const defaultTheme = getThemeForRole('customer');
        applyTheme(defaultTheme);
    }, []);

    // Session management is now handled by sessionManager
    // No need for manual localStorage management

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

        fetch("/api/v1/auth/login", {
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
                const rawId = data.id ?? null;
                const numericId = typeof rawId === "number" ? rawId : Number(rawId);
                const profile = {
                    id: Number.isFinite(numericId) ? numericId : null,
                    full_name: data.full_name || loginForm.username || loginForm.email || "",
                    role: data.role || (data.account_type === "member" ? "customer" : "customer"),
                    account_type: data.account_type || "member",
                    email: data.email || loginForm.email || "",
                    username: data.username || loginForm.username || "",
                };

                // Check if user is already logged in
                const identifier = profile.account_type === 'staff' ? profile.username : profile.email;
                const existingSessionId = sessionManager.findExistingSession(profile.account_type, identifier);

                if (existingSessionId) {
                    // Switch to existing session
                    sessionManager.switchSession(existingSessionId);
                    setStatusMessage(`Switched to existing session for ${profile.full_name}`);
                } else {
                    // Create new session
                    sessionManager.createSession(profile, data.access_token || "");
                    setStatusMessage(nextPath ? "Login successful. Let's build your drink." : "Login successful.");
                }

                // Update current state
                setToken(data.access_token || "");
                setUser(profile);
                setLoginForm(EMPTY_LOGIN);
                
                if (nextPath) {
                    navigate(nextPath);
                }
            })
            .catch(error => setStatusMessage(error.message || "Log-in details are incorrect. Please try again."));
    };

    const handleOrderLoginSubmit = event => handleLoginSubmit(event, "/menu");

    const handleLogout = () => {
        const activeSession = sessionManager.getActiveSession();
        if (activeSession) {
            sessionManager.removeSession(activeSession.id);
            const newActiveSession = sessionManager.getActiveSession();
            
            if (newActiveSession) {
                // Switch to another session
                setToken(newActiveSession.token);
                setUser(newActiveSession.user);
                setStatusMessage(`Logged out. Switched to ${newActiveSession.user.full_name}`);
            } else {
                // No more sessions
                setToken("");
                setUser(null);
                setStatusMessage("Signed out.");
                setRecentOrderItems([]);
            }
        } else {
            // Fallback for single session logout
            setToken("");
            setUser(null);
            setStatusMessage("Signed out.");
            setRecentOrderItems([]);
        }
    };

    const handleGuestCheckout = () => {
        setToken("");
        setUser(null);
        setStatusMessage("Guest mode enabled. Browse the menu and build your order.");
        navigate("/menu");
    };

    const handleSessionChange = ({ user: newUser, token: newToken, isAuthenticated }) => {
        setUser(newUser);
        setToken(newToken);
        if (!isAuthenticated) {
            setRecentOrderItems([]);
            setAvailableRewards([]);
        } else {
            // Load available rewards when user logs in
            loadAvailableRewards(newToken);
        }
    };

    const loadAvailableRewards = async (authToken = token) => {
        if (!authToken) return;
        
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }

            const response = await fetch('/api/v1/rewards', { headers });
            const data = await response.json().catch(() => ({}));
            
            if (response.ok && data.available_rewards) {
                // Convert available reward counts to reward objects that can be applied
                const rewards = [];
                
                // Add free drink rewards
                for (let i = 0; i < (data.available_rewards.free_drink || 0); i++) {
                    rewards.push({
                        id: `free_drink_${i}`,
                        type: 'free_drink',
                        status: 'available'
                    });
                }
                
                // Add free add-on rewards
                for (let i = 0; i < (data.available_rewards.free_addon || 0); i++) {
                    rewards.push({
                        id: `free_addon_${i}`,
                        type: 'free_addon',
                        status: 'available'
                    });
                }
                
                setAvailableRewards(rewards);
            }
        } catch (err) {
            console.error('Failed to load available rewards:', err);
        }
    };

    const handleAddItemToCart = item => {
        setCartItems(previous => [
            ...previous,
            {
                ...item,
                id: tempId(),
            },
        ]);
        
        // Remove used rewards from available rewards
        if (item.appliedRewards && Array.isArray(item.appliedRewards)) {
            setAvailableRewards(prev => 
                prev.filter(reward => !item.appliedRewards.includes(reward.id))
            );
        }
        
        navigate("/cart");
    };

    const handleUpdateCartItem = (itemId, updates) => {
        setCartItems(previous => {
            const updatedItems = previous.map(item => {
                if (item.id === itemId) {
                    const oldRewards = item.appliedRewards || [];
                    const newRewards = updates.appliedRewards || [];
                    
                    // Find rewards that were removed from this item
                    const removedRewards = oldRewards.filter(reward => !newRewards.includes(reward));
                    
                    // Find rewards that were added to this item
                    const addedRewards = newRewards.filter(reward => !oldRewards.includes(reward));
                    
                    // Update available rewards
                    if (removedRewards.length > 0 || addedRewards.length > 0) {
                        setAvailableRewards(prev => {
                            // Add back removed rewards and remove newly added rewards
                            let updated = [...prev];
                            
                            // Add back removed rewards
                            removedRewards.forEach(rewardId => {
                                const rewardType = rewardId.includes('free_drink') ? 'free_drink' : 'free_addon';
                                updated.push({
                                    id: rewardId,
                                    type: rewardType,
                                    status: 'available'
                                });
                            });
                            
                            // Remove newly added rewards
                            updated = updated.filter(reward => !addedRewards.includes(reward.id));
                            
                            return updated;
                        });
                    }
                    
                    return { ...item, ...updates };
                }
                return item;
            });
            return updatedItems;
        });
    };

    const handleRemoveFromCart = (itemId) => {
        setCartItems(previous => {
            const itemToRemove = previous.find(item => item.id === itemId);
            if (itemToRemove && itemToRemove.appliedRewards) {
                // Return any applied rewards back to available pool
                setAvailableRewards(prev => {
                    const rewardsToReturn = itemToRemove.appliedRewards.map(rewardId => {
                        const rewardType = rewardId.includes('free_drink') ? 'free_drink' : 'free_addon';
                        return {
                            id: rewardId,
                            type: rewardType,
                            status: 'available'
                        };
                    });
                    return [...prev, ...rewardsToReturn];
                });
            }
            return previous.filter(item => item.id !== itemId);
        });
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

        // Extract all applied rewards from cart items
        const allAppliedRewards = [];
        cartItems.forEach(item => {
            if (item.appliedRewards && Array.isArray(item.appliedRewards)) {
                allAppliedRewards.push(...item.appliedRewards);
            }
        });
        
        const orderData = { 
            items: cartItems,
            appliedRewards: allAppliedRewards
        };

        fetch("/api/v1/orders", {
            method: "POST",
            headers,
            body: JSON.stringify(orderData),
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
                setRecentOrderItems(previous => [...items, ...previous]);
                setStatusMessage("Order placed!");
                setCartItems([]);
                loadAvailableRewards(); // Refresh rewards after order to update used status
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
        let url = "/api/v1/orders";
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
        
        // Add account_type: "staff" to the payload since we're creating staff accounts
        const staffPayload = {
            ...payload,
            account_type: "staff"
        };
        
        const response = await fetch("/api/v1/admin/accounts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify(staffPayload),
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



    // Ensure proper role handling for members vs staff
    let viewerRole = normalizeRole(user?.role) || "customer";
    if (user?.account_type === "member" && (viewerRole === "staff" || viewerRole === "manager")) {
        // Fix corrupted localStorage data where member has staff role
        viewerRole = "customer";
    }
    
    const isStaffSignedIn = Boolean(isAuthenticated && (viewerRole === "staff" || viewerRole === "manager"));
    const hideNavigationOnHome = currentPath === "/" && !isStaffSignedIn;
    const hideNavigationOnOrderBeforeAuth = currentPath === "/customer" && !isAuthenticated;
    const navigationLinks = (hideNavigationOnHome || hideNavigationOnOrderBeforeAuth)
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
        onSessionChange: handleSessionChange,
        showSessionSwitcher: sessionManager.getAllSessions().length > 1,
        userRole: viewerRole,
    };

    const sessionProps = {
        isAuthenticated,
        user,
        statusMessage,
        token,
    };

    switch (currentPath) {
        case "/customer":
            return (
                <SystemLayout system={systemProps}>
                    <OrderPage
                        navigate={navigate}
                        loginForm={loginForm}
                        statusMessage={statusMessage}
                        onLoginChange={handleLoginChange}
                        onLoginSubmit={handleOrderLoginSubmit}
                        onGuestCheckout={handleGuestCheckout}
                        isAuthenticated={isAuthenticated}
                        onLogout={handleLogout}
                        user={user}
                    />
                </SystemLayout>
            );
        case "/menu":
            return (
                <MenuSelectionPage
                    system={systemProps}
                    navigate={navigate}
                    onAddToCart={handleAddItemToCart}
                    availableRewards={availableRewards}
                    session={sessionProps}
                />
            );
        case "/register":
            return (
                <SystemLayout system={systemProps}>
                    <RegisterPage navigate={navigate} />
                </SystemLayout>
            );
        case "/cart":
            return (
                <CartPage
                    system={systemProps}
                    cartItems={cartItems}
                    navigate={navigate}
                    onCheckout={handleCheckout}
                    isCheckingOut={isSubmittingOrder}
                    availableRewards={availableRewards}
                    session={sessionProps}
                    onUpdateCartItem={handleUpdateCartItem}
                    onRemoveFromCart={handleRemoveFromCart}
                />
            );
        case "/schedule":
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
        case "/rewards":
            return (
                <RewardPage
                    system={systemProps}
                    session={sessionProps}
                    navigate={navigate}
                />
            );
        case "/inventory":
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
