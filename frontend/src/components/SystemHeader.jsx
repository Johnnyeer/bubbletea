import NavigationLink from './NavigationLink.jsx';

export default function SystemHeader({
                                         title = 'Restaurant Management',
                                         health,
                                         navigation = [],
                                         navigate,
                                         currentPath,
                                         statusMessage,
                                     }) {
    return (
        <header className="system-header">
            <div className="page-inner system-header__inner">
                <div className="system-header__branding">
                    <h1>{title}</h1>
                    <p>Backend health: {health ? health.status : '…'}</p>
                </div>
                {navigation.length > 0 && (
                    <nav className="system-header__nav">
                        {navigation.map(link => (
                            <NavigationLink key={link.to} to={link.to} navigate={navigate} currentPath={currentPath}>
                                {link.label}
                            </NavigationLink>
                        ))}
                    </nav>
                )}
            </div>
            {statusMessage && (
                <div className="system-header__status page-inner">
                    <div>{statusMessage}</div>
                </div>
            )}
        </header>
    );
}