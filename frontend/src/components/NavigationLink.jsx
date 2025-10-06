export default function NavigationLink({ to, navigate, currentPath, children }) {
    const handleClick = event => {
        event.preventDefault();
        if (typeof navigate === "function") {
            navigate(to);
        }
    };

    const isActive = currentPath === to;
    const className = isActive ? "tea-nav-link is-active" : "tea-nav-link";

    return (
        <a href={to} onClick={handleClick} className={className} aria-current={isActive ? "page" : undefined}>
            {children}
        </a>
    );
}

