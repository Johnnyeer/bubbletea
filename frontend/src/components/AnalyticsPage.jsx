import { useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle } from "./styles.js";

const statBoxStyle = {
    background: "var(--tea-surface)",
    border: "1px solid var(--tea-border-strong)",
    borderRadius: 24,
    padding: "18px 20px",
    display: "grid",
    gap: 8,
    boxShadow: "0 16px 36px -28px rgba(15, 23, 42, 0.45)",
};

const tableWrapperStyle = { overflowX: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 8 };
const headerCellStyle = { textAlign: "left", padding: "10px 4px", borderBottom: "1px solid var(--tea-border-strong)", fontWeight: 700, color: "#0f172a" };
const cellStyle = { padding: "10px 4px", borderBottom: "1px solid var(--tea-border)", verticalAlign: "top", color: "rgba(15, 23, 42, 0.78)" };
const errorBoxStyle = { border: "1px solid rgba(239, 68, 68, 0.32)", background: "rgba(254, 226, 226, 0.78)", borderRadius: 20, padding: "14px 18px", color: "#9f1239", fontWeight: 600 };
const infoTextStyle = { color: "rgba(15, 23, 42, 0.72)", fontSize: 14 };

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

const formatDateTime = value => {
    if (!value) {
        return null;
    }
    try {
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) {
            return null;
        }
        return dt.toLocaleString();
    } catch {
        return null;
    }
};

const formatCategoryLabel = value => {
    if (!value) {
        return 'Other';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
};

const resolveItemKey = item => {
    if (item && item.item_id !== undefined && item.item_id !== null) {
        return `item:${item.item_id}`;
    }
    if (item && item.item_key) {
        return item.item_key;
    }
    const category = item?.category || 'misc';
    const name = item?.name || 'item';
    return `${category}:${name}`.toLowerCase();
};

const PopularLine = ({ label, entry }) => {
    if (!entry) {
        return (
            <div>
                {label}: <span style={{ color: "var(--tea-muted)" }}>No data yet</span>
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
    const trackingSinceDetail = formatDateTime(summary.tracking_since);
    const totalDrinksHeading = trackingSinceLabel
        ? `Total drinks completed since ${trackingSinceLabel}`
        : "Total drinks completed";

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Sales Analytics</h2>
                        <p style={{ margin: "6px 0 0 0", color: "var(--tea-muted)" }}>Overview based on completed orders.</p>
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

                <div style={{ ...statBoxStyle, background: "rgba(255, 255, 255, 0.72)" }}>
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
                    {trackingSinceDetail ? (
                        <span style={infoTextStyle}>First drink completed on {trackingSinceDetail}.</span>
                    ) : (
                        <span style={infoTextStyle}>No completed drinks recorded yet.</span>
                    )}
                </div>

                <div>
                    <h3 style={{ margin: "8px 0" }}>Items sold</h3>
                    {itemsSold.length === 0 ? (
                        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 16, background: "rgba(255, 255, 255, 0.72)", color: "rgba(15, 23, 42, 0.72)" }}>
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
                                    {itemsSold.map(item => {
                                        const rowKey = resolveItemKey(item);
                                        return (
                                            <tr key={rowKey}>
                                                <td style={cellStyle}>{item.name || "Item"}</td>
                                                <td style={cellStyle}>{formatCategoryLabel(item.category)}</td>
                                                <td style={{ ...cellStyle, fontWeight: 600 }}>{formatNumber(item.quantity_sold)}</td>
                                            </tr>
                                        );
                                    })}
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

