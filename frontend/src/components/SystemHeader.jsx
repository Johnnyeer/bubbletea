import NavigationLink from "./NavigationLink.jsx";

const DEFAULT_TAGLINE = "Handcrafted brews & joyful service.";

const ROLE_TAGLINES = {
    customer: "Handcrafted brews & joyful service.",
    staff: "Efficient service & quality operations.",
    manager: "Strategic oversight & team excellence.",
    admin: "System administration & control."
};

const humanize = value => {
    if (typeof value !== "string" || !value.trim()) {
        return "";
    }
    return value
        .trim()
        .split(/[\s_-]+/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

const getHealthVariant = status => {
    const normalized = typeof status === "string" ? status.toLowerCase() : "";
    if (["ok", "healthy", "pass", "online"].includes(normalized)) {
        return "tea-chip--success";
    }
    if (["warn", "warning", "degraded"].includes(normalized)) {
        return "tea-chip--warning";
    }
    if (!normalized) {
        return "";
    }
    return "tea-chip--danger";
};

const renderHealthChip = health => {
    if (!health || typeof health !== "object") {
        return null;
    }
    const labelSource = health.label || health.message || health.status;
    const label = humanize(labelSource) || "Status";
    const variant = getHealthVariant(health.status);
    return (
        <span className={`tea-chip ${variant}`.trim()}>
            {label}
        </span>
    );
};

export default function SystemHeader({
    title = "Bubble Tea Shop",
    navigation = [],
    navigate,
    currentPath,
    subtitle,
    health,
    statusMessage,
    userRole = "customer",
}) {
    const navItems = navigation.map(link => (
        <NavigationLink key={link.to} to={link.to} navigate={navigate} currentPath={currentPath}>
            {link.label}
        </NavigationLink>
    ));

    const healthChip = renderHealthChip(health);
    const trimmedStatusMessage = typeof statusMessage === "string" && statusMessage.length > 88
        ? `${statusMessage.slice(0, 85)}...`
        : statusMessage;

    // Get role-specific tagline
    const normalizedRole = (userRole || 'customer').toLowerCase();
    const roleTagline = ROLE_TAGLINES[normalizedRole] || DEFAULT_TAGLINE;
    
    // Get role-specific title
    const getRoleTitle = (role) => {
        switch (role) {
            case 'manager':
            case 'admin':
                return "Bubble Tea Shop - Management Portal";
            case 'staff':
                return "Bubble Tea Shop - Staff Operations";
            default:
                return "Bubble Tea Shop";
        }
    };

    return (
        <header className="tea-header">
            <div className="tea-header__top">
                <div className="tea-header__branding">
                    <h1 className="tea-header__title">{getRoleTitle(normalizedRole)}</h1>
                    <p className="tea-header__subtitle">{subtitle || roleTagline}</p>
                </div>

            </div>
            {navItems.length > 0 && <nav className="tea-header__nav">{navItems}</nav>}
        </header>
    );
}

