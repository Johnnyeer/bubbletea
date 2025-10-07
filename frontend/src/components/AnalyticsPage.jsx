import { useCallback, useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

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

const SALES_TAB = "sales";
const SHIFTS_TAB = "shifts";

const tabContainerStyle = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.6)",
    borderRadius: 999,
    padding: 4,
};

const createTabButtonStyle = isActive => ({
    ...secondaryButtonStyle,
    padding: "10px 18px",
    borderRadius: 999,
    fontSize: 14,
    background: isActive ? "linear-gradient(135deg, var(--tea-primary), var(--tea-secondary))" : "rgba(255, 255, 255, 0.88)",
    color: isActive ? "#ffffff" : "#0f172a",
    border: isActive ? "1px solid transparent" : "1px solid rgba(15, 23, 42, 0.12)",
    boxShadow: isActive ? "0 18px 36px -22px rgba(249, 115, 22, 0.68)" : secondaryButtonStyle.boxShadow,
});

const subtleButtonStyle = {
    ...secondaryButtonStyle,
    padding: "10px 18px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
};

const statusStyles = {
    overbooked: { background: "rgba(220, 38, 38, 0.12)", color: "#b91c1c" },
    balanced: { background: "rgba(16, 185, 129, 0.14)", color: "#047857" },
    underbooked: { background: "rgba(37, 99, 235, 0.12)", color: "#1d4ed8" },
};

const statusLabels = {
    overbooked: "Overbooked",
    balanced: "Balanced",
    underbooked: "Needs Shifts",
};

const statusPillBaseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 12px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.01em",
};

const formatHours = value => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
        return "0";
    }
    const hasFraction = Math.abs(amount % 1) > 1e-6;
    return amount.toLocaleString(undefined, {
        minimumFractionDigits: hasFraction ? 1 : 0,
        maximumFractionDigits: hasFraction ? 1 : 0,
    });
};

const formatHourDelta = value => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || Math.abs(amount) < 1e-6) {
        return "0h";
    }
    const absAmount = Math.abs(amount);
    const hasFraction = Math.abs(absAmount % 1) > 1e-6;
    const formatted = absAmount.toLocaleString(undefined, {
        minimumFractionDigits: hasFraction ? 1 : 0,
        maximumFractionDigits: hasFraction ? 1 : 0,
    });
    return `${amount > 0 ? "+" : "-"}${formatted}h`;
};

const formatRoleLabel = value => {
    if (!value) {
        return "Staff";
    }
    const normalized = value.toString().toLowerCase();
    if (normalized === "manager") {
        return "Manager";
    }
    if (normalized === "staff") {
        return "Staff";
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const startOfWeek = (reference = new Date()) => {
    const date = new Date(reference);
    if (Number.isNaN(date.getTime())) {
        return startOfWeek(new Date());
    }
    const diff = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

const addDays = (value, amount) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date();
    }
    date.setDate(date.getDate() + amount);
    return date;
};

const toISODate = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatWeekRange = (start, end) => {
    if (!start || !end) {
        return "";
    }
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return "";
        }
        const startLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(startDate);
        const endLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(endDate);
        return `${startLabel} � ${endLabel}`;
    } catch {
        return "";
    }
};
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

    const [activeTab, setActiveTab] = useState(SALES_TAB);
    const [shiftAnalytics, setShiftAnalytics] = useState(null);
    const [shiftError, setShiftError] = useState("");
    const [isLoadingShifts, setIsLoadingShifts] = useState(false);
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => toISODate(startOfWeek()));
    const currentWeekStart = useMemo(() => toISODate(startOfWeek()), []);
    const isCurrentWeek = selectedWeekStart === currentWeekStart;

    const userRole = typeof session?.user?.role === "string" ? session.user.role.toLowerCase() : "";
    const isStaff = userRole === "staff" || userRole === "manager";
    const token = session?.token || "";
    const updateStatus = typeof system?.onStatusMessage === "function" ? system.onStatusMessage : null;

    const headers = useMemo(() => (token ? { Authorization: "Bearer " + token } : {}), [token]);

    const loadAnalytics = useCallback(() => {
        if (!isStaff) {
            return;
        }
        setIsLoading(true);
        setError("");
        fetch("/api/v1/analytics/summary", { headers: { ...headers, Accept: "application/json" } })
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Unable to load analytics");
                }
                return data;
            })
            .then(data => {
                setAnalytics(data);
                updateStatus?.("Sales analytics updated.");
            })
            .catch(err => {
                const message = err.message || "Unable to load analytics";
                setError(message);
                updateStatus?.(message);
                setAnalytics(null);
            })
            .finally(() => setIsLoading(false));
    }, [headers, isStaff, updateStatus]);

    const loadShiftAnalytics = useCallback(
        weekStartISO => {
            if (!isStaff) {
                return;
            }
            const fallbackWeek = selectedWeekStart || currentWeekStart;
            const targetWeek = weekStartISO || fallbackWeek || currentWeekStart;
            setIsLoadingShifts(true);
            setShiftError("");
            fetch(`/api/v1/analytics/shifts?week_start=${targetWeek}`, { headers: { ...headers, Accept: "application/json" } })
                .then(async response => {
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        throw new Error(data.error || "Unable to load scheduling analytics");
                    }
                    return data;
                })
                .then(data => {
                    setShiftAnalytics(data);
                    const weekStartValue = data?.week?.start_date;
                    if (weekStartValue && weekStartValue !== selectedWeekStart) {
                        setSelectedWeekStart(weekStartValue);
                    }
                    updateStatus?.("Scheduling analytics updated.");
                })
                .catch(err => {
                    const message = err.message || "Unable to load scheduling analytics";
                    setShiftError(message);
                    setShiftAnalytics(null);
                    updateStatus?.(message);
                })
                .finally(() => setIsLoadingShifts(false));
        },
        [currentWeekStart, headers, isStaff, selectedWeekStart, updateStatus]
    );

    useEffect(() => {
        if (!isStaff) {
            return;
        }
        loadAnalytics();
    }, [isStaff, loadAnalytics]);

    useEffect(() => {
        if (!isStaff || activeTab !== SHIFTS_TAB) {
            return;
        }
        const targetWeek = selectedWeekStart || currentWeekStart;
        loadShiftAnalytics(targetWeek);
    }, [isStaff, activeTab, selectedWeekStart, currentWeekStart, loadShiftAnalytics]);

    const handleTabChange = tab => {
        if (tab === activeTab) {
            return;
        }
        setActiveTab(tab);
        if (tab === SHIFTS_TAB && !shiftAnalytics) {
            setShiftError("");
        }
    };

    const handleWeekChange = direction => {
        if (direction > 0 && isCurrentWeek) {
            return;
        }
        setSelectedWeekStart(prev => {
            const base = prev || currentWeekStart;
            const nextDate = addDays(base, direction * 7);
            return toISODate(nextDate);
        });
    };

    const handleRefreshShifts = () => {
        loadShiftAnalytics(selectedWeekStart || currentWeekStart);
    };

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

    const weekInfo = shiftAnalytics?.week || {};
    const overview = shiftAnalytics?.overview || {};
    const staffEntries = Array.isArray(shiftAnalytics?.staff) ? shiftAnalytics.staff : [];

    const baseWeekStart = weekInfo.start_date || selectedWeekStart || currentWeekStart;
    let baseWeekEnd = weekInfo.end_date;
    if (!baseWeekEnd && baseWeekStart) {
        baseWeekEnd = toISODate(addDays(baseWeekStart, 6));
    }
    const weekLabel = formatWeekRange(baseWeekStart, baseWeekEnd);
    const recommendedMax = overview?.recommended_max_hours || 0;
    const canGoForward = !isCurrentWeek;

    const renderSalesContent = () => {
        const trackingSinceLabel = formatDateLabel(summary.tracking_since);
        const trackingSinceDetail = formatDateTime(summary.tracking_since);
        const totalDrinksHeading = trackingSinceLabel ? `Total drinks completed since ${trackingSinceLabel}` : "Total drinks completed";
        return (
            <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Sales Analytics</h2>
                        <p style={{ margin: "6px 0 0 0", color: "var(--tea-muted)" }}>Overview based on completed orders.</p>
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={loadAnalytics}
                            style={{ ...primaryButtonStyle, opacity: isLoading ? 0.7 : 1 }}
                            disabled={isLoading}
                        >
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
            </>
        );
    };

    const renderShiftContent = () => {
        const overbooked = staffEntries.filter(entry => entry.status === "overbooked");
        const underbooked = staffEntries.filter(entry => entry.status === "underbooked");
        const showEmptyState = !isLoadingShifts && staffEntries.length === 0;
        const coverageLabel = entry => {
            const counts = Array.isArray(entry?.daily_counts) ? entry.daily_counts : [];
            if (counts.length === 0) {
                return <span style={{ color: "var(--tea-muted)" }}>No shifts this week</span>;
            }
            return counts
                .map(count => {
                    const dayLabel = count.day || formatDateLabel(count.date) || "Day";
                    return `${dayLabel} (${count.count})`;
                })
                .join(", ");
        };
        const statusPill = status => {
            const style = { ...statusPillBaseStyle, ...(statusStyles[status] || statusStyles.balanced) };
            return <span style={style}>{statusLabels[status] || statusLabels.balanced}</span>;
        };

        return (
            <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Scheduling Analytics</h2>
                        <p style={{ margin: "6px 0 0 0", color: "var(--tea-muted)" }}>
                            Ranked weekly hours for staff and managers.
                        </p>
                        {weekLabel && (
                            <p style={{ margin: "6px 0 0 0", color: "rgba(15, 23, 42, 0.6)", fontSize: 14 }}>
                                Week of {weekLabel}
                            </p>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={() => handleWeekChange(-1)}
                            style={{ ...subtleButtonStyle, opacity: isLoadingShifts ? 0.7 : 1 }}
                            disabled={isLoadingShifts}
                        >
                            ? Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWeekChange(1)}
                            style={{ ...subtleButtonStyle, opacity: canGoForward ? (isLoadingShifts ? 0.7 : 1) : 0.5 }}
                            disabled={!canGoForward || isLoadingShifts}
                        >
                            Next ?
                        </button>
                        <button
                            type="button"
                            onClick={handleRefreshShifts}
                            style={{ ...primaryButtonStyle, opacity: isLoadingShifts ? 0.7 : 1 }}
                            disabled={isLoadingShifts}
                        >
                            {isLoadingShifts ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>

                {shiftError && <div style={errorBoxStyle}>{shiftError}</div>}

                <div style={{ display: "grid", gap: 16 }}>
                    <div style={statBoxStyle}>
                        <h3 style={{ margin: 0 }}>Weekly load</h3>
                        <span style={{ fontSize: 28, fontWeight: 700 }}>{formatHours(overview.total_hours)}h</span>
                        <span style={infoTextStyle}>
                            Average {formatHours(overview.average_hours)}h per person across {overview.total_people || 0} team members.
                        </span>
                    </div>

                    <div style={{ ...statBoxStyle, background: "rgba(255, 255, 255, 0.72)" }}>
                        <h3 style={{ margin: 0 }}>Guidance</h3>
                        <span style={infoTextStyle}>
                            Recommended max workload: {formatHours(recommendedMax)}h.
                        </span>
                        {overbooked.length > 0 && (
                            <span style={{ ...infoTextStyle, fontWeight: 600 }}>
                                High load: {overbooked.map(entry => entry.full_name).join(", ")}.
                            </span>
                        )}
                        {underbooked.length > 0 && (
                            <span style={infoTextStyle}>
                                Needs coverage: {underbooked.map(entry => entry.full_name).join(", ")}.
                            </span>
                        )}
                        {overbooked.length === 0 && underbooked.length === 0 && (
                            <span style={infoTextStyle}>Shift distribution looks balanced.</span>
                        )}
                    </div>
                </div>

                <div>
                    <h3 style={{ margin: "8px 0" }}>Weekly hours per person</h3>
                    {showEmptyState ? (
                        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 16, background: "rgba(255, 255, 255, 0.72)", color: "rgba(15, 23, 42, 0.72)" }}>
                            No shifts scheduled for this week yet.
                        </div>
                    ) : (
                        <div style={tableWrapperStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={headerCellStyle}>Rank</th>
                                        <th style={headerCellStyle}>Team member</th>
                                        <th style={headerCellStyle}>Hours</th>
                                        <th style={headerCellStyle}>Delta vs avg</th>
                                        <th style={headerCellStyle}>Status</th>
                                        <th style={headerCellStyle}>Coverage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffEntries.map(entry => (
                                        <tr key={entry.staff_id}>
                                            <td style={{ ...cellStyle, fontWeight: 600 }}>{entry.rank}</td>
                                            <td style={cellStyle}>
                                                <div style={{ fontWeight: 600 }}>{entry.full_name}</div>
                                                <div style={{ color: "var(--tea-muted)", fontSize: 12 }}>{formatRoleLabel(entry.role)}</div>
                                            </td>
                                            <td style={{ ...cellStyle, fontWeight: 600 }}>{formatHours(entry.total_hours)}h</td>
                                            <td style={cellStyle}>{formatHourDelta(entry.hour_delta_from_average)}</td>
                                            <td style={cellStyle}>{statusPill(entry.status)}</td>
                                            <td style={cellStyle}>{coverageLabel(entry)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const isSalesTab = activeTab === SALES_TAB;

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={tabContainerStyle}>
                    <button
                        type="button"
                        onClick={() => handleTabChange(SALES_TAB)}
                        style={createTabButtonStyle(isSalesTab)}
                    >
                        Sales
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange(SHIFTS_TAB)}
                        style={createTabButtonStyle(!isSalesTab)}
                    >
                        Scheduling
                    </button>
                </div>
                {isSalesTab ? renderSalesContent() : renderShiftContent()}
            </section>
        </SystemLayout>
    );
}
