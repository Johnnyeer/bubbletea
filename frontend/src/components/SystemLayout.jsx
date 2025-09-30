import SystemHeader from './SystemHeader.jsx';

export default function SystemLayout({
                                         children,
                                         system,
                                         footer = null,
                                         showHeader = true,
                                         contentMaxWidth = 960,
                                     }) {
    const headerProps = system || {};
    const shouldRenderHeader = showHeader && system;

    return (
        <div className="app-surface">
            {shouldRenderHeader && <SystemHeader {...headerProps} />}
            <main className="page-content">
                <div className="page-inner" style={{ maxWidth: contentMaxWidth }}>
                    {children}
                </div>
            </main>
            {footer && (
                <footer className="page-footer">
                    <div className="page-inner" style={{ maxWidth: contentMaxWidth }}>
                        {footer}
                    </div>
                </footer>
            )}
        </div>
    );
}