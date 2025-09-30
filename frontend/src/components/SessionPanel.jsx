export default function SessionPanel({ isAuthenticated, user, onLoadDashboard, dashboardData }) {
    return (
        <section style={{ maxWidth: '40rem' }}>
            <h2>Session</h2>

            {isAuthenticated && user ? (
                <div style={{ marginBottom: '1rem' }}>
                    <p>
                        Signed in as {user.full_name} ({user.role})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <button type="button" onClick={() => onLoadDashboard('customer')}>
                            Customer dashboard
                        </button>
                        {(user.role === 'staff' || user.role === 'manager') && (
                            <button type="button" onClick={() => onLoadDashboard('staff')}>
                                Staff dashboard
                            </button>
                        )}
                        {user.role === 'manager' && (
                            <button type="button" onClick={() => onLoadDashboard('manager')}>
                                Manager dashboard
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <p>You are not signed in. Visit the order or admin pages to log in.</p>
            )}

            {dashboardData && (
                <div>
                    <h3>{dashboardData.message}</h3>
                    <ul>
                        {dashboardData.available_actions?.map(action => (
                            <li key={action}>{action}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}