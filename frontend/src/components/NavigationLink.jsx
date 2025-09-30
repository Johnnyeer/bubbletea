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
                padding: '6px 10px',
                borderRadius: 6,
                textDecoration: 'none',
                color: isActive ? '#0b5ed7' : '#1f2933',
                background: isActive ? 'rgba(11, 94, 215, 0.08)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
            }}
        >
            {children}
        </a>
    );
}