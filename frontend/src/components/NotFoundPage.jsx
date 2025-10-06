import SystemLayout from './SystemLayout.jsx';
import { primaryButtonStyle } from './styles.js';

export default function NotFoundPage({ system, navigate }) {

    return (
        <SystemLayout system={system}>
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <h2 style={{ marginBottom: 16 }}>Page not found</h2>
                <p style={{ marginBottom: 24, color: 'var(--tea-muted)' }}>
                    The page you were looking for has moved. Try heading back to the home screen.
                </p>
                <button onClick={() => navigate('/')} style={primaryButtonStyle}>
                    Back to home
                </button>
            </div>
        </SystemLayout>
    );
}

