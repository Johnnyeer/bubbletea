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
            style={{ textDecoration: isActive ? 'underline' : 'none', fontWeight: isActive ? 'bold' : 'normal' }}
        >
            {children}
        </a>
    );
}