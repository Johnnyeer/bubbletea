import { pillButtonStyle } from './styles.js';

export default function SessionPanel({ isAuthenticated, user, onLoadDashboard, dashboardData, statusMessage }) {
    return (
        <section style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
            <div>
                <h2 style={{ margin: 0 }}>Session overview</h2>
                <p style={{ marginTop: 4, color: '#4a5568' }}>Status message: {statusMessage || 'None'}</p>
            </div>
            {isAuthenticated ? (
                <div style={{ border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: 12, padding: 20 }}>
                    <p style={{ margin: '0 0 6px 0' }}>
                        <strong>Name:</strong> {user.full_name}
                    </p>
                    <p style={{ margin: '0 0 6px 0' }}>
                        <strong>Email:</strong> {user.email}
                    </p>
                    <p style={{ margin: '0 0 12px 0' }}>
                        <strong>Role:</strong> {user.role}
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button onClick={() => onLoadDashboard('customer')} style={pillButtonStyle}>
                            Customer dashboard
                        </button>
                        {(user.role === 'staff' || user.role === 'manager') && (
                            <button onClick={() => onLoadDashboard('staff')} style={pillButtonStyle}>
                                Staff dashboard
                            </button>
                        )}
                        {user.role === 'manager' && (
                            <button onClick={() => onLoadDashboard('manager')} style={pillButtonStyle}>
                                Manager dashboard
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ border: '1px dashed #cbd5f5', borderRadius: 12, padding: 20, background: '#f8fafc' }}>
                    <p style={{ margin: 0, color: '#4a5568' }}>
                        You are not signed in. Visit the order or admin pages to log in and view dashboards.
                    </p>
                </div>
            )}

            {dashboardData && (
                <div style={{ border: '1px solid #bfdbfe', background: '#e0f2fe', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ marginTop: 0 }}>{dashboardData.message}</h3>
                    <ul style={{ margin: '12px 0 0 16px', color: '#1e3a8a' }}>
                        {dashboardData.available_actions?.map(action => (
                            <li key={action}>{action}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}