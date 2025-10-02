import NavigationLink from "./NavigationLink.jsx";

export default function SystemHeader({
    title = "Bubble Tea Shop",
    navigation = [],
    navigate,
    currentPath,
}) {
    const navItems = navigation.map((link, index) => (
        <span key={link.to}>
            <NavigationLink to={link.to} navigate={navigate} currentPath={currentPath}>
                {link.label}
            </NavigationLink>
            {index < navigation.length - 1 ? " | " : ""}
        </span>
    ));

    return (
        <header>
            <div style={{ fontWeight: "bold" }}>{title}</div>
            {navItems.length > 0 && <div style={{ margin: "8px 0" }}>{navItems}</div>}
            <hr style={{ margin: "8px 0" }} />
        </header>
    );
}
