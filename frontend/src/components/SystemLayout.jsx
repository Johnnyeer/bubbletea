import SystemHeader from "./SystemHeader.jsx";

export default function SystemLayout({ children, system, footer = null, showHeader = true }) {
    const shouldRenderHeader = showHeader && system;

    return (
        <div style={{
            fontFamily: "'Arial', 'Helvetica', sans-serif",
            padding: "16px",
            lineHeight: 1.6,
        }}>
            {shouldRenderHeader && <SystemHeader {...system} />}
            <main style={{ marginTop: shouldRenderHeader ? 16 : 0 }}>{children}</main>
            {footer && <footer style={{ marginTop: 24 }}>{footer}</footer>}
        </div>
    );
}
