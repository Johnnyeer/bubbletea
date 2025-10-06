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
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                        <button onClick={() => onLoadDashboard("customer")} style={pillButtonStyle}>
                            Customer dashboard
                        </button>
                        {(role === "staff" || role === "manager") && (
                            <button onClick={() => onLoadDashboard("staff")} style={pillButtonStyle}>
                                Staff dashboard
                            </button>
                        )}
                        {role === "manager" && (
                            <button onClick={() => onLoadDashboard("manager")} style={pillButtonStyle}>
                                Manager dashboard
                            </button>
                        )}
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

