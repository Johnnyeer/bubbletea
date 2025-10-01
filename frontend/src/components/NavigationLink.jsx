export default function NavigationLink({ to, navigate, currentPath, children }) {
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
                textDecoration: "none",
                color: isActive ? "#1d4ed8" : "#0f172a",
                fontWeight: isActive ? "bold" : "normal",
                padding: "4px 6px",
            }}
        >
            {children}
        </a>
    );
}
