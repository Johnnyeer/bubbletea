import { useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle } from "./styles.js";

const statBoxStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 16,
    display: "grid",
    gap: 6,
};

const tableWrapperStyle = { overflowX: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 8 };
const headerCellStyle = { textAlign: "left", padding: "8px 4px", borderBottom: "1px solid #cbd5e1", fontWeight: "bold" };
const cellStyle = { padding: "8px 4px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" };
const errorBoxStyle = { border: "1px solid #fca5a5", background: "#fee2e2", borderRadius: 8, padding: 12, color: "#991b1b" };
const infoTextStyle = { color: "#475569", fontSize: 14 };

const formatNumber = value => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
        return "0";
    }
    return amount.toLocaleString();
};

const formatDateLabel = value => {
    if (!value) {
        return null;
    }
    try {
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) {
            return null;
        }
        return dt.toLocaleDateString();
    } catch {
        return null;
    }
};

const PopularLine = ({ label, entry }) => {
    if (!entry) {
        return (
            <div>
                {label}: <span style={{ color: "#64748b" }}>No data yet</span>
            </div>
        );
    }

    const countLabel = entry.count === 1 ? "1 item" : `${formatNumber(entry.count)} items`;

    return (
        <div>
            {label}: <strong>{entry.label}</strong> ({countLabel})
        </div>
    );
};

export default function AnalyticsPage({ system, session }) {
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const userRole = typeof session?.user?.role === "string" ? session.user.role.toLowerCase() : "";
    const isStaff = userRole === "staff" || userRole === "manager";
    const token = session?.token || "";
    const updateStatus = typeof system?.onStatusMessage === "function" ? system.onStatusMessage : null;

    const headers = useMemo(() => (token ? { Authorization: "Bearer " + token } : {}), [token]);

    const loadAnalytics = () => {
        if (!isStaff) {
            return;
        }
        setIsLoading(true);
        setError("");
        fetch("/api/analytics/summary", { headers })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Unable to load analytics");
                }
                return data;
            })
            .then(data => {
                setAnalytics(data);
                updateStatus?.("Analytics updated.");
            })
            .catch(err => {
                const message = err.message || "Unable to load analytics";
                setError(message);
                updateStatus?.(message);
                setAnalytics(null);
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (!isStaff) {
            return;
        }
        loadAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStaff, token]);

    if (!isStaff) {
        return (
            <SystemLayout system={system}>
                <section style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>Analytics</h2>
                    <p>Staff access required.</p>
                </section>
            </SystemLayout>
        );
    }

    const summary = analytics?.summary || {};
    const popular = analytics?.popular || {};
    const itemsSold = Array.isArray(analytics?.items_sold) ? analytics.items_sold : [];

    const trackingSinceLabel = formatDateLabel(summary.tracking_since);
    const totalDrinksHeading = trackingSinceLabel
        ? `Total drinks completed since ${trackingSinceLabel}`
        : "Total drinks completed";

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Sales Analytics</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#4a5568" }}>Overview based on completed orders.</p>
                    </div>
                    <div>
                        <button type="button" onClick={loadAnalytics} style={{ ...primaryButtonStyle, opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
                            {isLoading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>

                {error && <div style={errorBoxStyle}>{error}</div>}

                <div style={statBoxStyle}>
                    <h3 style={{ margin: 0 }}>Pending orders</h3>
                    <span style={{ fontSize: 28, fontWeight: 700 }}>{formatNumber(summary.pending_order_items)}</span>
                    <span style={infoTextStyle}>Items still in the live queue.</span>
                </div>

                <div style={{ ...statBoxStyle, background: "#f8fafc" }}>
                    <h3 style={{ margin: 0 }}>Most popular options</h3>
                    <div style={{ ...infoTextStyle, marginTop: 4 }}>
                        <PopularLine label="Tea" entry={popular.tea} />
                        <PopularLine label="Milk" entry={popular.milk} />
                        <PopularLine label="Add-on" entry={popular.addon} />
                    </div>
                </div>

                <div style={statBoxStyle}>
                    <h3 style={{ margin: 0 }}>{totalDrinksHeading}</h3>
                    <span style={{ fontSize: 28, fontWeight: 700 }}>{formatNumber(summary.total_items_sold)}</span>
                    {!trackingSinceLabel && (
                        <span style={infoTextStyle}>No completed drinks recorded yet.</span>
                    )}
                </div>

                <div>
                    <h3 style={{ margin: "8px 0" }}>Items sold</h3>
                    {itemsSold.length === 0 ? (
                        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 16, background: "#f8fafc", color: "#475569" }}>
                            No completed orders recorded yet.
                        </div>
                    ) : (
                        <div style={tableWrapperStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={headerCellStyle}>Item</th>
                                        <th style={headerCellStyle}>Category</th>
                                        <th style={headerCellStyle}>Sold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsSold.map(item => (
                                        <tr key={item.item_id}>
                                            <td style={cellStyle}>{item.name || "Item"}</td>
                                            <td style={cellStyle}>
                                                {(item.category || "").charAt(0).toUpperCase() + (item.category || "").slice(1)}
                                            </td>
                                            <td style={{ ...cellStyle, fontWeight: 600 }}>{formatNumber(item.quantity_sold)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p style={infoTextStyle}>Analytics use completed order records. Pending orders remain in the live queue.</p>
            </section>
        </SystemLayout>
    );
}

