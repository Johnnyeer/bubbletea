import { pillButtonStyle } from "./styles.js";

export default function SessionPanel({ isAuthenticated, user, onLoadDashboard, dashboardData, statusMessage }) {
    const identifierLabel = user?.account_type === "staff" ? "Username" : "Email";
    const identifierValue = user?.account_type === "staff"
        ? user?.username || user?.email || "Not provided"
        : user?.email || "Not provided";
    const role = typeof user?.role === "string" ? user.role.toLowerCase() : "";

    return (
        <section style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Session</h3>
            <p>Status: {statusMessage || "None"}</p>
            {isAuthenticated ? (
                <div>
                    <p>Name: {user.full_name}</p>
                    <p>
                        {identifierLabel}: {identifierValue}
                    </p>
                    <p>Role: {user.role}</p>
                    <div style={{ marginTop: 8 }}>
                        <label htmlFor="dashboard-select" style={{ fontWeight: 600, marginRight: 8 }}>Dashboard:</label>
                        <select
                            id="dashboard-select"
                            style={{ padding: "8px 18px", borderRadius: 999, fontWeight: 500 }}
                            onChange={e => onLoadDashboard(e.target.value)}
                            defaultValue={role === "manager" ? "manager" : role === "staff" ? "staff" : "customer"}
                        >
                            <option value="customer">Customer dashboard</option>
                            {(role === "staff" || role === "manager") && (
                                <option value="staff">Staff dashboard</option>
                            )}
                            {role === "manager" && (
                                <option value="manager">Manager dashboard</option>
                            )}
                        </select>
                    </div>
                </div>
            ) : (
                <p>You are not signed in.</p>
            )}
            {dashboardData && (
                <div style={{ marginTop: 12 }}>
                    <p>{dashboardData.message}</p>
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

