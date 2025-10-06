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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

const formatShiftListLabel = shifts => {
    if (!Array.isArray(shifts) || shifts.length === 0) {
        return "No one scheduled yet";
    }
    return shifts
        .map(entry => entry.staff_name || `Staff #${entry.staff_id}`)
        .join(", ");
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
    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [assignmentInputs, setAssignmentInputs] = useState({});
    const [pendingKey, setPendingKey] = useState(null);

    const updateStatus = typeof onStatusMessage === "function" ? onStatusMessage : (msg => system?.onStatusMessage?.(msg));

    const headers = useMemo(() => {
        const headerBag = { "Content-Type": "application/json" };
        if (authToken) {
            headerBag.Authorization = "Bearer " + authToken;
        }
        return headerBag;
    }, [authToken]);

    const tryLoadViaDashboard = async () => {
        if (typeof session?.onLoadDashboard !== "function") {
            return false;
        }
        try {
            await session.onLoadDashboard("scheduling");
            const data = session?.dashboardData;
            if (data && Array.isArray(data.shifts)) {
                setShifts(data.shifts);
                if (data.start_date) setRangeStart(data.start_date);
                if (data.end_date) setRangeEnd(data.end_date);
                return true;
            }
        } catch (err) {
            console.warn("Dashboard scheduling load failed", err);
        }
        return false;
    };

    const loadShifts = async () => {
        setIsLoading(true);
        setError("");
        try {
            const usedDashboard = await tryLoadViaDashboard();
            if (usedDashboard) {
                return;
            }
            const response = await fetch("/api/scheduling", { headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Unable to load schedule");
            }
            const collection = Array.isArray(data.shifts) ? data.shifts : [];
            setShifts(collection);
            setRangeStart(data.start_date || null);
            setRangeEnd(data.end_date || null);
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
        loadShifts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStaff, token]);

    const upcomingDays = useMemo(() => {
        const startDate = startOfDay(rangeStart ? parseISODate(rangeStart) : new Date());
        return Array.from({ length: 7 }, (_, offset) => {
            const current = new Date(startDate.getTime() + offset * DAY_IN_MS);
            return {
                date: current,
                iso: toLocalISODate(current),
                label: formatDateLabel(current),
            };
        });
    }, [rangeStart]);

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
            setError("Enter a staff ID before assigning this shift.");
            updateStatus?.("Enter a staff ID before assigning this shift.");
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
            const response = await fetch("/api/scheduling", {
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
            const response = await fetch(`/api/scheduling/${shift.id}`, {
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

    const titleDescription = `Manage hourly shifts between ${SHIFT_SLOTS[0].window.split(" - ")[0]} and ${SHIFT_SLOTS[SHIFT_SLOTS.length - 1].window.split(" - ")[1]}.`;

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Upcoming Schedule</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#475569" }}>{titleDescription}</p>
                        {rangeStart && rangeEnd && (
                            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: 14 }}>
                                Showing {formatDateLabel(parseISODate(rangeStart))} through {formatDateLabel(parseISODate(rangeEnd))}.
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={loadShifts} style={primaryButtonStyle} disabled={isLoading}>
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {error && (
                    <div
                        style={{
                            border: "1px solid #fca5a5",
                            background: "#fee2e2",
                            borderRadius: 8,
                            padding: 12,
                            color: "#991b1b",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div style={{ display: "grid", gap: 16 }}>
                    {upcomingDays.map(day => {
                        const dayAssignments = shiftLookup.get(day.iso) || {};
                        return (
                            <article
                                key={day.iso}
                                style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 12,
                                    padding: 16,
                                    background: "#fff",
                                    display: "grid",
                                    gap: 16,
                                }}
                            >
                                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                                    <h3 style={{ margin: 0 }}>{day.label}</h3>
                                    <span style={{ color: "#64748b", fontSize: 14 }}>{day.iso}</span>
                                </header>

                                <div style={{ display: "grid", gap: 12 }}>
                                    {SHIFT_SLOTS.map(slot => {
                                        const slotAssignments = dayAssignments[slot.key] || [];
                                        const viewerHasShift = slotAssignments.some(item => item.staff_id === viewerId);
                                        const assignmentKey = getAssignmentKey(day.iso, slot.key);
                                        const inputValue = assignmentInputs[assignmentKey] ?? "";
                                        const claimDisabled = pendingKey === `claim-${day.iso}-${slot.key}`;
                                        const removingShiftId = pendingKey?.startsWith("remove-")
                                            ? Number(pendingKey.replace("remove-", ""))
                                            : null;
                                        return (
                                            <section
                                                key={slot.key}
                                                style={{
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 10,
                                                    padding: 12,
                                                    display: "grid",
                                                    gap: 8,
                                                }}
                                            >
                                                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{slot.label} Slot</div>
                                                        <div style={{ color: "#64748b", fontSize: 13 }}>{slot.window}</div>
                                                    </div>
                                                    <div style={{ color: "#475569", fontSize: 13 }}>{formatShiftListLabel(slotAssignments)}</div>
                                                </header>

                                                {slotAssignments.length > 0 && (
                                                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                                                        {slotAssignments.map(item => {
                                                            const removing = removingShiftId === item.id;
                                                            return (
                                                                <li key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600 }}>{item.staff_name || `Staff #${item.staff_id}`}</div>
                                                                        <div style={{ color: "#64748b", fontSize: 13 }}>{item.role || "staff"}</div>
                                                                    </div>
                                                                    {(canManageAll || item.staff_id === viewerId) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveShift(item)}
                                                                            disabled={pendingKey === `remove-${item.id}`}
                                                                            style={{
                                                                                ...secondaryButtonStyle,
                                                                                padding: "4px 10px",
                                                                                opacity: pendingKey === `remove-${item.id}` ? 0.7 : 1,
                                                                                cursor: pendingKey === `remove-${item.id}` ? "wait" : "pointer",
                                                                            }}
                                                                        >
                                                                            {removing ? "Removing..." : "Remove"}
                                                                        </button>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}

                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                                                    {canManageAll ? (
                                                        <>
                                                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <span style={{ fontWeight: 600 }}>Staff ID</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={inputValue}
                                                                    onChange={event => handleAssignmentInputChange(day.iso, slot.key, event.target.value)}
                                                                    placeholder="Enter ID"
                                                                    style={{ ...inputStyle, width: 120 }}
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleClaimShift(day.iso, slot.key, inputValue)}
                                                                disabled={claimDisabled}
                                                                style={{
                                                                    ...primaryButtonStyle,
                                                                    padding: "6px 14px",
                                                                    opacity: claimDisabled ? 0.7 : 1,
                                                                    cursor: claimDisabled ? "wait" : "pointer",
                                                                }}
                                                            >
                                                                {claimDisabled ? "Assigning..." : "Assign"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleClaimShift(day.iso, slot.key, viewerId ?? undefined)}
                                                                disabled={claimDisabled}
                                                                style={{
                                                                    ...secondaryButtonStyle,
                                                                    padding: "6px 14px",
                                                                    opacity: claimDisabled ? 0.7 : 1,
                                                                    cursor: claimDisabled ? "wait" : "pointer",
                                                                }}
                                                            >
                                                                Assign Me
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleClaimShift(day.iso, slot.key)}
                                                            disabled={viewerHasShift || claimDisabled}
                                                            style={{
                                                                ...primaryButtonStyle,
                                                                padding: "6px 14px",
                                                                opacity: viewerHasShift || claimDisabled ? 0.6 : 1,
                                                                cursor: viewerHasShift || claimDisabled ? "not-allowed" : "pointer",
                                                            }}
                                                        >
                                                            {viewerHasShift ? "You're scheduled" : claimDisabled ? "Claiming..." : "Claim this shift"}
                                                        </button>
                                                    )}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        </SystemLayout>
    );
}
