"""Scheduling endpoints."""
from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity
from sqlalchemy import select

from .auth import _json_error, _parse_identity, role_required, session_scope
from .models import ScheduleShift, SHIFT_NAMES, Staff
bp = Blueprint("schedules", __name__, url_prefix="/api/scheduling")


def current_local_datetime() -> datetime:
    """Return the current local datetime with timezone info."""
    return datetime.now(timezone.utc).astimezone()


def to_local_iso(value: datetime | None) -> str | None:
    """Return a local ISO8601 string for the given datetime."""
    if value is None or not isinstance(value, datetime):
        return None
    dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        local_dt = dt.astimezone()
    except (OSError, ValueError):
        local_dt = dt
    return local_dt.isoformat()


def _serialize_shift(shift: ScheduleShift, staff: Staff | None = None):
    staff_obj = staff or shift.staff
    return {
        "id": shift.id,
        "staff_id": shift.staff_id,
        "staff_name": staff_obj.full_name if staff_obj else None,
        "role": staff_obj.role if staff_obj else None,
        "shift_date": shift.shift_date.isoformat() if shift.shift_date else None,
        "shift_name": shift.shift_name,
        "created_at": to_local_iso(shift.created_at),
    }


@bp.get("")
@role_required("staff", "manager")
def list_shifts():
    today = current_local_datetime().date()
    end_date = today + timedelta(days=7)

    with session_scope() as session:
        stmt = (
            select(ScheduleShift, Staff)
            .join(Staff, Staff.id == ScheduleShift.staff_id)
            .where(ScheduleShift.shift_date >= today)
            .where(ScheduleShift.shift_date < end_date)
        )
        rows = session.execute(stmt.order_by(ScheduleShift.shift_date, ScheduleShift.shift_name)).all()
        payload = [_serialize_shift(shift, staff) for shift, staff in rows]
        return jsonify(
            {
                "shifts": payload,
                "start_date": today.isoformat(),
                "end_date": (end_date - timedelta(days=1)).isoformat(),
            }
        )


@bp.post("")
@role_required("staff", "manager")
def create_shift():
    data = request.get_json(silent=True) or {}

    shift_date_raw = data.get("shift_date") or data.get("date")
    shift_name_raw = (data.get("shift_name") or data.get("shift") or "").strip().lower()
    staff_id_raw = data.get("staff_id")

    if not shift_date_raw:
        return _json_error("shift_date is required", 400)

    try:
        shift_date_val = date.fromisoformat(shift_date_raw)
    except (TypeError, ValueError):
        return _json_error("shift_date must be YYYY-MM-DD", 400)

    if shift_name_raw not in SHIFT_NAMES:
        valid = ", ".join(SHIFT_NAMES)
        return _json_error(f"shift_name must be one of: {valid}", 400)

    today = current_local_datetime().date()
    if shift_date_val < today:
        return _json_error("shift_date cannot be before today", 400)

    account_type, account_id = _parse_identity(get_jwt_identity())
    claims = get_jwt() or {}
    role = (claims.get("role") or "").lower()
    requested_staff_id = None
    if staff_id_raw is not None:
        try:
            requested_staff_id = int(staff_id_raw)
        except (TypeError, ValueError):
            return _json_error("staff_id must be an integer", 400)

    can_assign_others = role in {"manager", "admin"}

    if can_assign_others:
        staff_id = requested_staff_id or account_id
    else:
        # staff members can only create shifts for themselves
        staff_id = account_id
        if requested_staff_id and requested_staff_id != staff_id:
            return _json_error("staff cannot assign shifts to others", 403)

    if not staff_id:
        return _json_error("staff_id is required", 400)

    with session_scope() as session:
        staff = session.get(Staff, staff_id)
        if not staff:
            return _json_error("staff member not found", 404)

        existing = session.scalar(
            select(ScheduleShift)
            .where(ScheduleShift.staff_id == staff_id)
            .where(ScheduleShift.shift_date == shift_date_val)
            .where(ScheduleShift.shift_name == shift_name_raw)
        )
        if existing:
            return _json_error("shift already exists for that staff member", 409)

        shift = ScheduleShift(
            staff_id=staff_id,
            shift_date=shift_date_val,
            shift_name=shift_name_raw,
            created_at=current_local_datetime(),
        )
        session.add(shift)
        session.commit()
        session.refresh(shift)

        return jsonify(_serialize_shift(shift, staff)), 201


@bp.delete("/<int:shift_id>")
@role_required("staff", "manager")
def delete_shift(shift_id: int):
    account_type, account_id = _parse_identity(get_jwt_identity())
    claims = get_jwt() or {}
    role = (claims.get("role") or "").lower()

    with session_scope() as session:
        shift = session.get(ScheduleShift, shift_id)
        if not shift:
            return _json_error("shift not found", 404)

        can_manage_others = role in {"manager", "admin"}

        if not can_manage_others and shift.staff_id != account_id:
            return _json_error("insufficient permissions", 403)

        session.delete(shift)
        session.commit()

        return jsonify({"message": "shift removed"})




