import SystemHeader from "./SystemHeader.jsx";

export default function SystemLayout({ children, system, footer = null, showHeader = true }) {
    const shouldRenderHeader = Boolean(showHeader && system);

    return (
        <div className="tea-page">
            <div className="tea-page__inner">
                {shouldRenderHeader && <SystemHeader {...system} />}
                <main className="tea-page__content">{children}</main>
                {footer && <footer className="tea-page__footer">{footer}</footer>}
            </div>
        </div>
    );
}

