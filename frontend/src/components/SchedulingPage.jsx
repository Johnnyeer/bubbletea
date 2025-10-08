import { useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

const SHIFT_START_HOUR = 10;
const SHIFT_END_HOUR = 22; // exclusive end hour

const formatTimeRange = (startHour, endHour) => {
    const format = hour =>
        new Date(0, 0, 0, hour)
            .toLocaleTimeString([], { 
                hour: "numeric", 
                minute: "2-digit",
                hour12: true 
            })
            .replace(":00", "");
    return `${format(startHour)} - ${format(endHour)}`;
};

const SHIFT_SLOTS = Array.from({ length: SHIFT_END_HOUR - SHIFT_START_HOUR }, (_, index) => {
    const startHour = SHIFT_START_HOUR + index;
    const endHour = startHour + 1;
    const key = `${String(startHour).padStart(2, "0")}:00`;
    return {
        key,
        label: new Date(0, 0, 0, startHour).toLocaleTimeString([], { 
            hour: "numeric", 
            minute: "2-digit",
            hour12: true 
        }).replace(":00", ""),
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
    width: "100%",
};
const scheduleTableStyle = {
    borderCollapse: "collapse",
    width: "100%",
    tableLayout: "fixed",
};

const timeHeaderCellStyle = {
    border: "1px solid var(--tea-border)",
    background: "#f1f5f9",
    padding: "6px 8px",
    fontWeight: 600,
    textAlign: "left",
    width: "120px",
    fontSize: 12,
};

const dayHeaderCellStyle = {
    border: "1px solid var(--tea-border)",
    background: "#f1f5f9",
    padding: "6px 4px",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 12,
    width: "calc((100% - 120px) / 7)",
};

const timeCellStyle = {
    border: "1px solid var(--tea-border)",
    background: "#f8fafc",
    padding: "4px 8px",
    fontWeight: 600,
    fontSize: 11,
    whiteSpace: "nowrap",
};

const scheduleCellStyle = {
    border: "1px solid var(--tea-border)",
    padding: "4px 6px",
    verticalAlign: "top",
    background: "#fff",
    cursor: "pointer",
    position: "relative",
    minHeight: "40px",
};

const scheduleCellHighlightStyle = {
    background: "rgba(221, 214, 254, 0.35)",
    borderColor: "var(--tea-secondary)",
};

const selectedCellStyle = {
    background: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgb(34, 197, 94)",
    borderWidth: "2px",
};

const assignedCellStyle = {
    background: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgb(59, 130, 246)",
};

const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
};

const modalContentStyle = {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
    minWidth: "320px",
    maxWidth: "480px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
};

const bulkActionButtonsStyle = {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid var(--tea-border)",
};

const assignmentMetaTextStyle = {
    fontSize: 12,
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

    const [pendingKey, setPendingKey] = useState(null);
    const [staffOptions, setStaffOptions] = useState([]);
    
    // New state for redesigned functionality
    const [selectedSlots, setSelectedSlots] = useState(new Set());
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [modalSlot, setModalSlot] = useState(null);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);

    const updateStatus = typeof onStatusMessage === "function" ? onStatusMessage : (msg => system?.onStatusMessage?.(msg));

    const headers = useMemo(() => {
        const headerBag = { "Content-Type": "application/json" };
        if (authToken) {
            headerBag.Authorization = "Bearer " + authToken;
        }
        return headerBag;
    }, [authToken]);



    const loadStaffOptions = async () => {
        if (!canManageAll) {
            setStaffOptions([]);
            return;
        }
        try {
            const response = await fetch("/api/v1/schedule/staff", { headers });
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
            const query = targetIso ? `?start_date=${encodeURIComponent(targetIso)}` : "";
            const response = await fetch(`/api/v1/schedule${query}`, { headers });
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
            const response = await fetch("/api/v1/schedule", {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to assign shift");
            }
            updateStatus?.(`Shift assigned for ${dateIso}.`);

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
            const response = await fetch(`/api/v1/schedule/${shift.id}`, {
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

    // New handlers for redesigned functionality
    const handleSlotClick = (day, slot) => {
        const slotKey = `${day.iso}-${slot.key}`;
        const dayAssignments = shiftLookup.get(day.iso) || {};
        const slotAssignments = dayAssignments[slot.key] || [];
        const viewerHasShift = slotAssignments.some(item => item.staff_id === viewerId);

        if (canManageAll) {
            // Manager: Show assignment modal
            setModalSlot({ day, slot });
            setShowAssignModal(true);
        } else {
            // Staff: Toggle selection for own shifts or select open slots
            if (viewerHasShift) {
                // If already assigned, add to removal selection
                setSelectedSlots(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(slotKey)) {
                        newSet.delete(slotKey);
                    } else {
                        newSet.add(slotKey);
                    }
                    return newSet;
                });
            } else if (slotAssignments.length === 0) {
                // If open slot, add to add selection
                setSelectedSlots(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(slotKey)) {
                        newSet.delete(slotKey);
                    } else {
                        newSet.add(slotKey);
                    }
                    return newSet;
                });
            }
        }
    };

    const handleAssignToStaff = async (staffId) => {
        if (!modalSlot || !staffId) return;
        
        const { day, slot } = modalSlot;
        setPendingKey(`assign-${day.iso}-${slot.key}`);
        setError("");
        
        try {
            const payload = { 
                shift_date: day.iso, 
                shift_name: slot.key,
                staff_id: Number(staffId)
            };
            
            const response = await fetch("/api/v1/schedule", {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to assign shift");
            }
            updateStatus?.(`Shift assigned for ${day.iso}.`);
            await loadShifts();
            setShowAssignModal(false);
            setModalSlot(null);
        } catch (err) {
            const message = err.message || "Unable to assign shift";
            setError(message);
            updateStatus?.(message);
        } finally {
            setPendingKey(null);
        }
    };

    const handleBulkAddShifts = async () => {
        if (selectedSlots.size === 0) return;
        
        setIsProcessingBulk(true);
        setError("");
        
        try {
            const promises = Array.from(selectedSlots).map(async (slotKey) => {
                const [dateIso, shiftName] = slotKey.split('-');
                const payload = { 
                    shift_date: dateIso, 
                    shift_name: shiftName 
                };
                
                const response = await fetch("/api/v1/schedule", {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                });
                
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || `Failed to add shift ${slotKey}`);
                }
            });
            
            await Promise.all(promises);
            updateStatus?.(`Added ${selectedSlots.size} shifts.`);
            setSelectedSlots(new Set());
            await loadShifts();
        } catch (err) {
            const message = err.message || "Unable to add shifts";
            setError(message);
            updateStatus?.(message);
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const handleBulkRemoveShifts = async () => {
        if (selectedSlots.size === 0) return;
        
        setIsProcessingBulk(true);
        setError("");
        
        try {
            const shiftsToRemove = [];
            
            // Find the shift IDs for selected slots
            selectedSlots.forEach(slotKey => {
                const [dateIso, shiftName] = slotKey.split('-');
                const dayAssignments = shiftLookup.get(dateIso) || {};
                const slotAssignments = dayAssignments[shiftName] || [];
                const viewerShift = slotAssignments.find(item => item.staff_id === viewerId);
                if (viewerShift) {
                    shiftsToRemove.push(viewerShift);
                }
            });
            
            const promises = shiftsToRemove.map(async (shift) => {
                const response = await fetch(`/api/v1/schedule/${shift.id}`, {
                    method: "DELETE",
                    headers,
                });
                
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || `Failed to remove shift ${shift.id}`);
                }
            });
            
            await Promise.all(promises);
            updateStatus?.(`Removed ${shiftsToRemove.length} shifts.`);
            setSelectedSlots(new Set());
            await loadShifts();
        } catch (err) {
            const message = err.message || "Unable to remove shifts";
            setError(message);
            updateStatus?.(message);
        } finally {
            setIsProcessingBulk(false);
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
        const slotKey = `${day.iso}-${slot.key}`;
        const isSelected = selectedSlots.has(slotKey);
        
        // Determine cell style based on state
        let cellStyle = { ...scheduleCellStyle };
        if (isSelected) {
            cellStyle = { ...cellStyle, ...selectedCellStyle };
        } else if (viewerHasShift) {
            cellStyle = { ...cellStyle, ...scheduleCellHighlightStyle };
        } else if (slotAssignments.length > 0) {
            cellStyle = { ...cellStyle, ...assignedCellStyle };
        }
        
        return (
            <td 
                key={`${day.iso}-${slot.key}`} 
                style={cellStyle}
                onClick={() => handleSlotClick(day, slot)}
                title={canManageAll ? "Click to assign staff" : "Click to select shift"}
            >
                <div style={{ textAlign: "center", fontSize: 10 }}>
                    {slotAssignments.length === 0 ? (
                        <span style={{ color: "#888" }}>Open</span>
                    ) : (
                        <div>
                            {slotAssignments.map((item, index) => (
                                <div key={item.id} style={{ 
                                    fontWeight: item.staff_id === viewerId ? 600 : 400,
                                    color: item.staff_id === viewerId ? "var(--tea-secondary)" : "#333"
                                }}>
                                    {item.staff_name || `#${item.staff_id}`}
                                </div>
                            ))}
                        </div>
                    )}
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
                                    const dayLabel = day.date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
                                    const weekdayLabel = day.date.toLocaleDateString(undefined, { weekday: "short" });
                                    return (
                                        <th key={day.iso} style={headerStyle}>
                                            <div style={{ fontSize: 10, letterSpacing: "0.08em" }}>{weekdayLabel.toUpperCase()}</div>
                                            <div style={{ fontSize: 12, fontWeight: 600 }}>{dayLabel}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {SHIFT_SLOTS.map(slot => (
                                <tr key={slot.key}>
                                    <th scope="row" style={timeCellStyle}>
                                        <div style={{ fontWeight: 600 }}>{slot.label}</div>
                                    </th>
                                    {upcomingDays.map(day => renderShiftCell(day, slot))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Bulk action buttons for staff */}
                {!canManageAll && selectedSlots.size > 0 && (
                    <div style={bulkActionButtonsStyle}>
                        <button
                            type="button"
                            onClick={handleBulkAddShifts}
                            disabled={isProcessingBulk}
                            style={{
                                ...primaryButtonStyle,
                                opacity: isProcessingBulk ? 0.7 : 1,
                                cursor: isProcessingBulk ? "wait" : "pointer"
                            }}
                        >
                            {isProcessingBulk ? "Processing..." : `Add ${selectedSlots.size} Shifts`}
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkRemoveShifts}
                            disabled={isProcessingBulk}
                            style={{
                                ...secondaryButtonStyle,
                                opacity: isProcessingBulk ? 0.7 : 1,
                                cursor: isProcessingBulk ? "wait" : "pointer"
                            }}
                        >
                            {isProcessingBulk ? "Processing..." : `Remove ${selectedSlots.size} Shifts`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedSlots(new Set())}
                            style={secondaryButtonStyle}
                        >
                            Clear Selection
                        </button>
                    </div>
                )}
            </section>
            
            {/* Assignment Modal for Managers */}
            {showAssignModal && modalSlot && (
                <div style={modalOverlayStyle} onClick={() => setShowAssignModal(false)}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 16px 0" }}>Assign Shift</h3>
                        <p style={{ margin: "0 0 16px 0", color: "var(--tea-muted)" }}>
                            {modalSlot.day.label} at {modalSlot.slot.label}
                        </p>
                        
                        {staffOptions.length === 0 ? (
                            <p style={{ color: "var(--tea-muted)" }}>No staff available</p>
                        ) : (
                            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                                {staffOptions.map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleAssignToStaff(option.id)}
                                        disabled={pendingKey}
                                        style={{
                                            ...secondaryButtonStyle,
                                            textAlign: "left",
                                            opacity: pendingKey ? 0.7 : 1,
                                            cursor: pendingKey ? "wait" : "pointer"
                                        }}
                                    >
                                        {option.full_name} (#{option.id}) - {option.role || "staff"}
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={() => setShowAssignModal(false)}
                                style={secondaryButtonStyle}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SystemLayout>
    );
}
