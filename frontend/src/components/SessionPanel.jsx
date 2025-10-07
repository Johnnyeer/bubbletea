export default function SessionPanel({ isAuthenticated, user, statusMessage }) {
    const identifierLabel = user?.account_type === "staff" ? "Username" : "Email";
    const identifierValue = user?.account_type === "staff"
        ? user?.username || user?.email || "Not provided"
        : user?.email || "Not provided";

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
                </div>
            ) : (
                <p>You are not signed in.</p>
            )}
        </section>
    );
}

