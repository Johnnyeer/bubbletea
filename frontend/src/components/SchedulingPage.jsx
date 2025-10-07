import { useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

const SHIFT_START_HOUR = 10;
const SHIFT_END_HOUR = 22; // exclusive end hour

const formatTimeRange = (startHour, endHour) => {
    const format = hour =>
        new Date(0, 0, 0, hour)
            .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            .replace(":00", "");
    return `${format(startHour)} - ${format(endHour)}`;
};

const SHIFT_SLOTS = Array.from({ length: SHIFT_END_HOUR - SHIFT_START_HOUR }, (_, index) => {
    const startHour = SHIFT_START_HOUR + index;
    const endHour = startHour + 1;
    const key = `${String(startHour).padStart(2, "0")}:00`;
    return {
        key,
        label: new Date(0, 0, 0, startHour).toLocaleTimeString([], { hour: "numeric" }),
        window: formatTimeRange(startHour, endHour),
    };
});

const parseISODate = iso => {
    if (!iso) {
        return new Date();
    }
    const parts = iso.split("-").map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date(iso);
};

const startOfDay = value => {
    const base = value instanceof Date ? new Date(value) : new Date(value);
    base.setHours(0, 0, 0, 0);
    return base;
};


const startOfWeek = value => {
    const base = startOfDay(value);
    const day = base.getDay();
    const offset = (day + 6) % 7;
    base.setDate(base.getDate() - offset);
    return base;
};

const addDays = (value, amount) => {
    const base = new Date(value);
    base.setDate(base.getDate() + amount);
    return base;
};

const formatDateLabel = date =>
    date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

const toLocalISODate = value => {
    const base = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(base.getTime())) {
        return "";
    }
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, "0");
    const day = String(base.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


const pageContainerStyle = {
    ...cardStyle,
    padding: 24,
    display: "grid",
    gap: 24,
};

const headerRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
};

const headerTextGroupStyle = {
    display: "grid",
    gap: 4,
};

const weekRangeNavigationStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
};

const weekNavigationButtonStyle = {
    ...secondaryButtonStyle,
    padding: "6px 10px",
    lineHeight: 1,
    fontSize: "1rem",
};

const actionGroupStyle = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
};

const compactButtonStyle = {
    ...secondaryButtonStyle,
    padding: "8px 14px",
};

const createShiftButtonStyle = {
    ...primaryButtonStyle,
    padding: "10px 20px",
};

const refreshButtonStyle = {
    ...secondaryButtonStyle,
    padding: "8px 14px",
};

const tableWrapperStyle = {
    overflowX: "auto",
};
const scheduleTableStyle = {
    borderCollapse: "collapse",
    width: "100%",
    minWidth: 960,
};

const timeHeaderCellStyle = {
    border: "1px solid var(--tea-border)",
    background: "#f1f5f9",
    padding: "10px 12px",
    fontWeight: 600,
    textAlign: "left",
    width: 140,
};

const dayHeaderCellStyle = {
    border: "1px solid var(--tea-border)",
    background: "#f1f5f9",
    padding: "10px 12px",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 14,
};

const timeCellStyle = {
    border: "1px solid var(--tea-border)",
    background: "#f8fafc",
    padding: "8px 12px",
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: "nowrap",
};

const scheduleCellStyle = {
    border: "1px solid var(--tea-border)",
    padding: "8px 12px",
    verticalAlign: "top",
    background: "#fff",
};

const scheduleCellHighlightStyle = {
    background: "rgba(221, 214, 254, 0.35)",
    borderColor: "var(--tea-secondary)",
};

const cellContentStyle = {
    display: "grid",
    gap: 8,
};

const assignmentListStyle = {
    display: "grid",
    gap: 6,
};

const assignmentItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid var(--tea-border)",
    background: "#f8fafc",
};

const assignmentMetaTextStyle = {
    fontSize: 12,
    color: "var(--tea-muted)",
};

const emptyCellTextStyle = {
    fontSize: 13,
    color: "var(--tea-muted)",
};

const cellActionsStyle = {
    display: "grid",
    gap: 8,
};

const actionsRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
};

const assignLabelTextStyle = {
    fontSize: 13,
    fontWeight: 600,
};

const staffUnavailableTextStyle = {
    fontSize: 13,
    color: "var(--tea-muted)",
};

const errorBannerStyle = {
    border: "1px solid rgba(239, 68, 68, 0.32)",
    background: "rgba(254, 226, 226, 0.78)",
    borderRadius: 12,
    padding: "12px 16px",
    color: "#9f1239",
    fontWeight: 600,
};

const weekSummaryTextStyle = {
    fontSize: 13,
    color: "var(--tea-muted)",
};

const formatWeekRange = (startDate, endDate) => {
    if (!startDate || !endDate) {
        return "";
    }
    const sameMonth = startDate.getMonth() === endDate.getMonth();
    const sameYear = startDate.getFullYear() === endDate.getFullYear();

    const startLabel = startDate.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    const endOptions = { day: "numeric" };
    if (!sameMonth) {
        endOptions.month = "long";
    }
    if (!sameYear) {
        endOptions.year = "numeric";
    }
    const endLabel = endDate.toLocaleDateString(undefined, endOptions);
    const trailingYear = sameYear ? `, ${startDate.getFullYear()}` : "";
    return `Week of ${startLabel} - ${endLabel}${trailingYear}`;
};

export default function SchedulingPage({ system, session, navigate, token, onStatusMessage }) {
    const viewer = session?.user;
    const viewerIdRaw = viewer?.id;
    const parsedViewerId = typeof viewerIdRaw === "number" ? viewerIdRaw : Number(viewerIdRaw);
    const viewerId = Number.isFinite(parsedViewerId) ? parsedViewerId : null;
    const viewerRole = typeof viewer?.role === "string" ? viewer.role.toLowerCase() : "customer";
    const isStaff = ["staff", "manager", "admin"].includes(viewerRole);
    const canManageAll = viewerRole === "manager" || viewerRole === "admin";
    const authToken = token || session?.token || "";

    const [shifts, setShifts] = useState([]);
    const [weekStartIso, setWeekStartIso] = useState(() => toLocalISODate(startOfWeek(new Date())));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [assignmentInputs, setAssignmentInputs] = useState({});
    const [pendingKey, setPendingKey] = useState(null);
    const [staffOptions, setStaffOptions] = useState([]);

    const updateStatus = typeof onStatusMessage === "function" ? onStatusMessage : (msg => system?.onStatusMessage?.(msg));

    const headers = useMemo(() => {
        const headerBag = { "Content-Type": "application/json" };
        if (authToken) {
            headerBag.Authorization = "Bearer " + authToken;
        }
        return headerBag;
    }, [authToken]);

    const tryLoadViaDashboard = async targetIso => {
        if (typeof session?.onLoadDashboard !== "function") {
            return false;
        }
        const defaultWeekIso = toLocalISODate(startOfWeek(new Date()));
        if (targetIso && targetIso !== defaultWeekIso) {
            return false;
        }
        try {
            await session.onLoadDashboard("scheduling");
            const data = session?.dashboardData;
            if (data && Array.isArray(data.shifts)) {
                setShifts(data.shifts);
                if (data.start_date) {
                    const normalized = toLocalISODate(startOfWeek(parseISODate(data.start_date)));
                    setWeekStartIso(normalized);
                } else {
                    setWeekStartIso(defaultWeekIso);
                }
                return true;
            }
        } catch (err) {
            console.warn("Dashboard scheduling load failed", err);
        }
        return false;
    };

    const loadStaffOptions = async () => {
        if (!canManageAll) {
            setStaffOptions([]);
            return;
        }
        try {
            const response = await fetch("/api/schedule/staff", { headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to load staff roster");
            }
            const options = Array.isArray(data.staff) ? data.staff : [];
            setStaffOptions(options);
        } catch (err) {
            const message = err.message || "Unable to load staff roster";
            setError(message);
            updateStatus?.(message);
        }
    };

    const loadShifts = async startDateOverrideIso => {
        const defaultWeekIso = toLocalISODate(startOfWeek(new Date()));
        const targetIso = startDateOverrideIso || weekStartIso || defaultWeekIso;
        setIsLoading(true);
        setError("");
        try {
            const usedDashboard = await tryLoadViaDashboard(targetIso);
            if (usedDashboard) {
                if (canManageAll) {
                    await loadStaffOptions();
                }
                return;
            }
            const query = targetIso ? `?start_date=${encodeURIComponent(targetIso)}` : "";
            const response = await fetch(`/api/schedule${query}`, { headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to load schedule");
            }
            const collection = Array.isArray(data.shifts) ? data.shifts : [];
            setShifts(collection);
            if (data.start_date) {
                const normalized = toLocalISODate(startOfWeek(parseISODate(data.start_date)));
                if (normalized !== weekStartIso) {
                    setWeekStartIso(normalized);
                }
            } else if (!weekStartIso && targetIso) {
                setWeekStartIso(targetIso);
            }
            if (canManageAll) {
                await loadStaffOptions();
            }
        } catch (err) {
            const message = err.message || "Unable to load schedule";
            setError(message);
            updateStatus?.(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isStaff) {
            return;
        }
        loadShifts(weekStartIso);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStaff, weekStartIso, token]);

    useEffect(() => {
        if (canManageAll && isStaff) {
            loadStaffOptions();
        } else {
            setStaffOptions([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManageAll, authToken]);

    const resolvedWeekStart = useMemo(() => {
        if (weekStartIso) {
            const parsed = parseISODate(weekStartIso);
            if (!Number.isNaN(parsed.getTime())) {
                return startOfWeek(parsed);
            }
        }
        return startOfWeek(new Date());
    }, [weekStartIso]);

    const todayStart = startOfDay(new Date());
    const displayStartDate = resolvedWeekStart.getTime() < todayStart.getTime() ? todayStart : resolvedWeekStart;

    const upcomingDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, offset) => {
            const current = addDays(displayStartDate, offset);
            return {
                date: current,
                iso: toLocalISODate(current),
                label: formatDateLabel(current),
            };
        });
    }, [displayStartDate]);

    const shiftLookup = useMemo(() => {
        const lookup = new Map();
        for (const shift of shifts) {
            const iso = shift.shift_date;
            if (!lookup.has(iso)) {
                lookup.set(iso, {});
            }
            lookup.get(iso)[shift.shift_name] = lookup.get(iso)[shift.shift_name] || [];
            lookup.get(iso)[shift.shift_name].push(shift);
        }
        return lookup;
    }, [shifts]);

    const getAssignmentKey = (isoDate, shiftKey) => `${isoDate}__${shiftKey}`;

    const handleAssignmentInputChange = (dateIso, shiftName, value) => {
        setAssignmentInputs(prev => ({ ...prev, [getAssignmentKey(dateIso, shiftName)]: value }));
    };

    const handleClaimShift = async (dateIso, shiftName, staffOverride) => {
        const finalStaffId = staffOverride ?? (canManageAll ? viewerId : undefined);
        const requiresExplicitId = canManageAll && staffOverride !== undefined;
        if (requiresExplicitId && (finalStaffId === undefined || finalStaffId === null || finalStaffId === "")) {
            const message = "Enter a staff ID before assigning this shift.";
            setError(message);
            updateStatus?.(message);
            return;
        }

        setPendingKey(`claim-${dateIso}-${shiftName}`);
        setError("");
        try {
            const payload = { shift_date: dateIso, shift_name: shiftName };
            if (finalStaffId !== undefined && finalStaffId !== null && finalStaffId !== "") {
                const numericId = Number(finalStaffId);
                if (!Number.isFinite(numericId) || Number.isNaN(numericId) || numericId <= 0) {
                    throw new Error("Enter a valid staff ID");
                }
                payload.staff_id = numericId;
            }
            const response = await fetch("/api/schedule", {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to assign shift");
            }
            updateStatus?.(`Shift assigned for ${dateIso}.`);
            if (canManageAll) {
                setAssignmentInputs(prev => ({ ...prev, [getAssignmentKey(dateIso, shiftName)]: "" }));
            }
            await loadShifts();
        } catch (err) {
            const message = err.message || "Unable to assign shift";
            setError(message);
            updateStatus?.(message);
        } finally {
            setPendingKey(null);
        }
    };

    const handleRemoveShift = async shift => {
        setPendingKey(`remove-${shift.id}`);
        setError("");
        try {
            const response = await fetch(`/api/schedule/${shift.id}`, {
                method: "DELETE",
                headers,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to remove shift");
            }
            updateStatus?.(`Removed shift for ${shift.shift_date}.`);
            await loadShifts();
        } catch (err) {
            const message = err.message || "Unable to remove shift";
            setError(message);
            updateStatus?.(message);
        } finally {
            setPendingKey(null);
        }
    };
    if (!isStaff) {
        return (
            <SystemLayout system={system}>
                <section style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>Schedule</h2>
                    <p>You must be signed in as staff to view scheduling.</p>
                    <button type="button" onClick={() => navigate("/")} style={secondaryButtonStyle}>
                        Back
                    </button>
                </section>
            </SystemLayout>
        );
    }

    const renderShiftCell = (day, slot) => {
        const dayAssignments = shiftLookup.get(day.iso) || {};
        const slotAssignments = dayAssignments[slot.key] || [];
        const viewerHasShift = slotAssignments.some(item => item.staff_id === viewerId);
        const assignmentKey = getAssignmentKey(day.iso, slot.key);
        const inputValue = assignmentInputs[assignmentKey] ?? "";
        const claimDisabled = pendingKey === `claim-${day.iso}-${slot.key}`;
        const removingShiftId = pendingKey?.startsWith("remove-") ? Number(pendingKey.replace("remove-", "")) : null;
        const cellStyle = viewerHasShift ? { ...scheduleCellStyle, ...scheduleCellHighlightStyle } : scheduleCellStyle;
        return (
            <td key={`${day.iso}-${slot.key}`} style={cellStyle}>
                <div style={cellContentStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>
                            {slotAssignments.length === 0 ? "Open shift" : `${slotAssignments.length} scheduled`}
                        </span>
                        <span style={assignmentMetaTextStyle}>{slot.window}</span>
                    </div>
                    {viewerHasShift && (
                        <span style={{ ...assignmentMetaTextStyle, color: "var(--tea-secondary)", fontWeight: 600 }}>
                            You're scheduled
                        </span>
                    )}
                    <div style={assignmentListStyle}>
                        {slotAssignments.length === 0 ? (
                            <span style={emptyCellTextStyle}>No one scheduled</span>
                        ) : (
                            slotAssignments.map(item => {
                                const removing = removingShiftId === item.id;
                                const viewerEntry = item.staff_id === viewerId;
                                const entryStyle = viewerEntry
                                    ? { ...assignmentItemStyle, borderColor: "var(--tea-secondary)", background: "rgba(221, 214, 254, 0.4)" }
                                    : assignmentItemStyle;
                                return (
                                    <div key={item.id} style={entryStyle}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{item.staff_name || `Staff #${item.staff_id}`}</div>
                                            <div style={assignmentMetaTextStyle}>{item.role || "staff"}</div>
                                        </div>
                                        {(canManageAll || viewerEntry) && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveShift(item)}
                                                disabled={pendingKey === `remove-${item.id}`}
                                                style={{ ...secondaryButtonStyle, padding: "4px 10px", opacity: removing ? 0.7 : 1, cursor: removing ? "wait" : "pointer" }}
                                            >
                                                {removing ? "Removing..." : "Remove"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div style={cellActionsStyle}>
                        {canManageAll ? (
                            <>
                                <div style={{ display: "grid", gap: 6 }}>
                                    <span style={assignLabelTextStyle}>Assign to</span>
                                    {staffOptions.length === 0 ? (
                                        <span style={staffUnavailableTextStyle}>No staff available</span>
                                    ) : (
                                        <select
                                            value={String(inputValue || "")}
                                            onChange={event => handleAssignmentInputChange(day.iso, slot.key, event.target.value)}
                                            style={{ ...inputStyle, minWidth: 180 }}
                                        >
                                            <option value="">Select staff</option>
                                            {staffOptions.map(option => (
                                                <option key={option.id} value={option.id}>
                                                    {option.full_name} (#{option.id})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div style={actionsRowStyle}>
                                    <button
                                        type="button"
                                        onClick={() => handleClaimShift(day.iso, slot.key, inputValue)}
                                        disabled={claimDisabled || staffOptions.length === 0}
                                        style={{ ...primaryButtonStyle, padding: "6px 14px", opacity: claimDisabled || staffOptions.length === 0 ? 0.7 : 1, cursor: claimDisabled || staffOptions.length === 0 ? "not-allowed" : "pointer" }}
                                    >
                                        {claimDisabled ? "Assigning..." : "Assign"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleClaimShift(day.iso, slot.key, viewerId ?? undefined)}
                                        disabled={claimDisabled}
                                        style={{ ...secondaryButtonStyle, padding: "6px 14px", opacity: claimDisabled ? 0.7 : 1, cursor: claimDisabled ? "wait" : "pointer" }}
                                    >
                                        Assign Me
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleClaimShift(day.iso, slot.key)}
                                disabled={viewerHasShift || claimDisabled}
                                style={{ ...primaryButtonStyle, padding: "6px 14px", opacity: viewerHasShift || claimDisabled ? 0.6 : 1, cursor: viewerHasShift || claimDisabled ? "not-allowed" : "pointer" }}
                            >
                                {viewerHasShift ? "You're scheduled" : claimDisabled ? "Claiming..." : "Claim this shift"}
                            </button>
                        )}
                    </div>
                </div>
            </td>
        );
    };

    const rangeStartDate = displayStartDate;
    const rangeEndDate = upcomingDays.length > 0 ? addDays(displayStartDate, upcomingDays.length - 1) : displayStartDate;
    const weekRangeLabel = formatWeekRange(rangeStartDate, rangeEndDate);
    const todayIso = toLocalISODate(todayStart);
    const titleDescription = `Manage hourly shifts between ${SHIFT_SLOTS[0].window.split(" - ")[0]} and ${SHIFT_SLOTS[SHIFT_SLOTS.length - 1].window.split(" - ")[1]}.`;

    const handleTodayClick = () => {
        const currentWeekIso = toLocalISODate(startOfWeek(new Date()));
        if (weekStartIso !== currentWeekIso) {
            setWeekStartIso(currentWeekIso);
        } else {
            loadShifts(currentWeekIso);
        }
    };

    const handleCreateShiftClick = () => {
        if (!canManageAll) {
            updateStatus?.("Only managers can create shifts.");
            return;
        }
        navigate?.("/inventory");
    };

    const handlePreviousWeek = () => {
        const previousStart = addDays(resolvedWeekStart, -7);
        setWeekStartIso(toLocalISODate(startOfWeek(previousStart)));
    };

    const handleNextWeek = () => {
        const nextStart = addDays(resolvedWeekStart, 7);
        setWeekStartIso(toLocalISODate(startOfWeek(nextStart)));
    };
    return (
        <SystemLayout system={system}>
            <section style={pageContainerStyle}>
                <div style={headerRowStyle}>
                    <div style={headerTextGroupStyle}>
                        <h2 style={{ margin: 0 }}>Weekly Schedule</h2>
                        <div style={weekRangeNavigationStyle}>
                            <button
                                type="button"
                                onClick={handlePreviousWeek}
                                disabled={isLoading}
                                aria-label="Previous week"
                                style={{ ...weekNavigationButtonStyle, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "wait" : "pointer" }}
                            >
                                {"\u2190"}
                            </button>
                            <span style={weekSummaryTextStyle}>{weekRangeLabel}</span>
                            <button
                                type="button"
                                onClick={handleNextWeek}
                                disabled={isLoading}
                                aria-label="Next week"
                                style={{ ...weekNavigationButtonStyle, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "wait" : "pointer" }}
                            >
                                {"\u2192"}
                            </button>
                        </div>
                        <span style={weekSummaryTextStyle}>{titleDescription}</span>
                    </div>
                    <div style={actionGroupStyle}>
                        <button
                            type="button"
                            onClick={handleTodayClick}
                            disabled={isLoading}
                            style={{ ...compactButtonStyle, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "wait" : "pointer" }}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => loadShifts(weekStartIso)}
                            disabled={isLoading}
                            style={{ ...refreshButtonStyle, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "wait" : "pointer" }}
                        >
                            {isLoading ? "Refreshing..." : "Refresh"}
                        </button>
                        {canManageAll && (
                            <button
                                type="button"
                                onClick={handleCreateShiftClick}
                                style={{ ...createShiftButtonStyle }}
                            >
                                Create shift
                            </button>
                        )}
                    </div>
                </div>
                {error && <div style={errorBannerStyle}>{error}</div>}
                <div style={tableWrapperStyle}>
                    <table style={scheduleTableStyle}>
                        <thead>
                            <tr>
                                <th style={timeHeaderCellStyle}>Time</th>
                                {upcomingDays.map(day => {
                                    const headerStyle = day.iso === todayIso
                                        ? { ...dayHeaderCellStyle, background: "#e0f2fe", borderColor: "#38bdf8" }
                                        : dayHeaderCellStyle;
                                    const dayLabel = day.date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
                                    const weekdayLabel = day.date.toLocaleDateString(undefined, { weekday: "short" });
                                    return (
                                        <th key={day.iso} style={headerStyle}>
                                            <div style={{ fontSize: 12, letterSpacing: "0.08em" }}>{weekdayLabel.toUpperCase()}</div>
                                            <div style={{ fontSize: 16, fontWeight: 600 }}>{dayLabel}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {SHIFT_SLOTS.map(slot => (
                                <tr key={slot.key}>
                                    <th scope="row" style={timeCellStyle}>
                                        <div>{slot.label}</div>
                                        <div style={assignmentMetaTextStyle}>{slot.window}</div>
                                    </th>
                                    {upcomingDays.map(day => renderShiftCell(day, slot))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </SystemLayout>
    );
}
