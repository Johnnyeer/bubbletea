import { useEffect, useMemo, useState } from "react";
import SystemLayout from "./SystemLayout.jsx";
import { cardStyle, inputStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles.js";

const SHIFT_SLOTS = [
    { key: "morning", label: "First Shift", window: "10:00 AM - 4:00 PM" },
    { key: "evening", label: "Second Shift", window: "4:00 PM - 10:00 PM" },
];

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
    }, [isStaff, authToken]);

    const upcomingDays = useMemo(() => {
        if (!isStaff) {
            return [];
        }
        const todayStart = startOfDay(new Date());
        const serverEnd = rangeEnd ? startOfDay(parseISODate(rangeEnd)) : null;
        const totalDays = serverEnd
            ? Math.max(7, Math.round((serverEnd.getTime() - todayStart.getTime()) / DAY_IN_MS) + 1)
            : 7;

        return Array.from({ length: totalDays }, (_, offset) => {
            const day = new Date(todayStart);
            day.setDate(todayStart.getDate() + offset);
            return {
                date: day,
                iso: toLocalISODate(day),
                label: formatDateLabel(day),
            };
        });
    }, [isStaff, rangeEnd, rangeStart]);

    const displayRangeStart = upcomingDays.length > 0 ? upcomingDays[0].iso : rangeStart;
    const displayRangeEnd = upcomingDays.length > 0 ? upcomingDays[upcomingDays.length - 1].iso : rangeEnd;

    const shiftLookup = useMemo(() => {
        const map = new Map();
        shifts.forEach(entry => {
            const dateKey = entry.shift_date || entry.date;
            const name = entry.shift_name;
            if (!dateKey || !name) {
                return;
            }
            const bucket = map.get(dateKey) || {};
            const listForShift = bucket[name] || [];
            listForShift.push(entry);
            listForShift.sort((a, b) => (a.staff_name || "").localeCompare(b.staff_name || ""));
            bucket[name] = listForShift;
            map.set(dateKey, bucket);
        });
        return map;
    }, [shifts]);

    const getAssignmentKey = (dateIso, shiftName) => `${dateIso}:${shiftName}`;

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

    return (
        <SystemLayout system={system}>
            <section style={{ ...cardStyle, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Upcoming Schedule</h2>
                        <p style={{ margin: "6px 0 0 0", color: "#475569" }}>
                            View and manage the first (10&nbsp;AM - 4&nbsp;PM) and second (4&nbsp;PM - 10&nbsp;PM) shifts.
                        </p>
                        {displayRangeStart && displayRangeEnd && (
                            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: 14 }}>
                                Showing {displayRangeStart} through {displayRangeEnd}.
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
                                <header>
                                    <h3 style={{ margin: 0 }}>{day.label}</h3>
                                    <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>{day.iso}</p>
                                </header>

                                <div style={{ display: "grid", gap: 16 }}>
                                    {SHIFT_SLOTS.map(slot => {
                                        const entries = dayAssignments[slot.key] || [];
                                        const viewerHasShift = entries.some(item => item.staff_id === viewerId);
                                        const assignmentKey = getAssignmentKey(day.iso, slot.key);
                                        const inputValue = assignmentInputs[assignmentKey] ?? "";
                                        const claimDisabled = pendingKey === `claim-${day.iso}-${slot.key}`;

                                        return (
                                            <section
                                                key={slot.key}
                                                style={{
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 10,
                                                    padding: 12,
                                                    display: "grid",
                                                    gap: 10,
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                                                    <div>
                                                        <h4 style={{ margin: 0 }}>{slot.label}</h4>
                                                        <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>{slot.window}</p>
                                                    </div>
                                                    <div style={{ color: "#1e3a8a", fontWeight: 600 }}>
                                                        {formatShiftListLabel(entries)}
                                                    </div>
                                                </div>

                                                {entries.length > 0 && (
                                                    <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 14 }}>
                                                        {entries.map(item => {
                                                            const removable = canManageAll || item.staff_id === viewerId;
                                                            const removing = pendingKey === `remove-${item.id}`;
                                                            return (
                                                                <li key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
                                                                    <span>
                                                                        {item.staff_name || `Staff #${item.staff_id}`} ({item.role || "staff"})
                                                                    </span>
                                                                    {removable && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveShift(item)}
                                                                            disabled={removing}
                                                                            style={{
                                                                                ...secondaryButtonStyle,
                                                                                padding: "4px 10px",
                                                                                fontSize: 13,
                                                                                opacity: removing ? 0.7 : 1,
                                                                                cursor: removing ? "wait" : "pointer",
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
