"""Analytics endpoints for staff and managers."""
from collections import Counter
from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import func, select

from .auth import _json_error, role_required
from .customizations import extract_customization_labels
from .db import SessionLocal
from .models import MenuItem, OrderItem, OrderRecord, ScheduleShift, Staff

bp = Blueprint("analytics", __name__, url_prefix="/api/v1/analytics")

SHIFT_DURATION_HOURS = 1
HOURS_VARIANCE_THRESHOLD = 2
MAX_RECOMMENDED_WEEKLY_HOURS = 35


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


def _current_local_datetime() -> datetime:
    return datetime.now(timezone.utc).astimezone()


def _current_local_date() -> date:
    return _current_local_datetime().date()


def _start_of_week(anchor: date) -> date:
    if not isinstance(anchor, date):
        raise TypeError("anchor must be a date instance")
    return anchor - timedelta(days=anchor.weekday())


def _parse_week_start(raw: str | None) -> date:
    if not raw:
        anchor = _current_local_date()
    else:
        try:
            anchor = date.fromisoformat(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("week_start or start_date must be YYYY-MM-DD") from exc
    return _start_of_week(anchor)


def _normalize_staff_role(value: str | None) -> str:
    if not value:
        return "staff"
    normalized = value.strip().lower()
    if normalized == "admin":
        return "manager"
    return normalized


def _weekday_label(day_value: date | None) -> str:
    if not isinstance(day_value, date):
        return ""
    return day_value.strftime("%a")


def _round_hours(value: float | int) -> float:
    return round(float(value or 0), 2)


@bp.get("/summary")
@role_required("staff", "manager")
def analytics_summary():
    with SessionLocal() as session:
        item_stmt = (
            select(
                MenuItem.id,
                MenuItem.name,
                MenuItem.category,
                func.sum(OrderRecord.qty).label("quantity_sold"),
            )
            .select_from(OrderRecord)
            .join(MenuItem, MenuItem.id == OrderRecord.item_id)
            .group_by(MenuItem.id)
            .order_by(func.sum(OrderRecord.qty).desc(), MenuItem.name)
        )
        sold_rows = session.execute(item_stmt).all()

        base_items = []
        total_sold = 0
        for item_id, name, category, quantity_sold in sold_rows:
            qty = int(quantity_sold or 0)
            total_sold += qty
            base_items.append(
                {
                    "item_id": item_id,
                    "item_key": f"menu:{item_id}",
                    "name": name,
                    "category": category,
                    "quantity_sold": qty,
                }
            )

        pending_stmt = select(func.count(OrderItem.id)).where(OrderItem.status != "complete")
        pending_count = session.scalar(pending_stmt) or 0

        start_stmt = select(func.min(OrderRecord.completed_at)).where(OrderRecord.completed_at.isnot(None))
        start_timestamp = session.scalar(start_stmt)
        tracking_since = to_local_iso(start_timestamp) if start_timestamp else None

        custom_stmt = select(OrderRecord.qty, OrderRecord.customizations).where(OrderRecord.customizations.isnot(None))
        customization_rows = session.execute(custom_stmt).all()

        tea_counter = Counter()
        milk_counter = Counter()
        addon_counter = Counter()

        for qty, raw in customization_rows:
            quantity = int(qty or 0)
            if quantity <= 0:
                continue
            tea_label, milk_label, addon_labels = extract_customization_labels(raw)
            if tea_label:
                tea_counter[tea_label] += quantity
            if milk_label:
                milk_counter[milk_label] += quantity
            for addon_label in addon_labels:
                addon_counter[addon_label] += quantity

        extra_items = []

        def _extend_from_counter(counter, category):
            for label, count in counter.most_common():
                if not label:
                    continue
                extra_items.append(
                    {
                        "item_id": None,
                        "item_key": f"{category}:{label.lower()}",
                        "name": label,
                        "category": category,
                        "quantity_sold": int(count),
                    }
                )

        _extend_from_counter(milk_counter, "milk")
        _extend_from_counter(addon_counter, "addon")

        items_sold = base_items + extra_items
        payload = {
            "summary": {
                "total_items_sold": total_sold,
                "pending_order_items": int(pending_count),
                "tracking_since": tracking_since,
            },
            "items_sold": items_sold,
            "popular": {
                "tea": _format_popular_entry(tea_counter),
                "milk": _format_popular_entry(milk_counter),
                "addon": _format_popular_entry(addon_counter),
            },
        }

    return jsonify(payload)


def _format_popular_entry(counter):
    if not counter:
        return None
    label, count = counter.most_common(1)[0]
    return {"label": label, "count": int(count)}


@bp.get("/shifts")
@role_required("staff", "manager")
def analytics_shifts():
    raw_week_start = request.args.get("week_start") or request.args.get("start_date")
    try:
        week_start = _parse_week_start(raw_week_start)
    except ValueError as exc:
        return _json_error(str(exc), 400)

    week_end = week_start + timedelta(days=7)
    week_days = []
    for offset in range(7):
        current_day = week_start + timedelta(days=offset)
        week_days.append({"date": current_day.isoformat(), "day": _weekday_label(current_day)})

    week_info = {
        "start_date": week_start.isoformat(),
        "end_date": (week_end - timedelta(days=1)).isoformat(),
        "week_number": week_start.isocalendar()[1],
        "year": week_start.isocalendar()[0],
        "days": week_days,
    }

    with SessionLocal() as session:
        staff_rows = session.execute(select(Staff).where(Staff.is_active.is_(True))).scalars().all()

        staff_info = []
        staff_ids = []
        for staff in staff_rows:
            normalized_role = _normalize_staff_role(staff.role)
            if normalized_role not in {"staff", "manager"}:
                continue
            staff_info.append({
                "id": staff.id,
                "full_name": staff.full_name,
                "role": normalized_role,
            })
            staff_ids.append(staff.id)

        shift_map: dict[int, list[dict[str, str]]] = {}
        if staff_ids:
            shift_stmt = (
                select(
                    ScheduleShift.staff_id,
                    ScheduleShift.shift_date,
                    ScheduleShift.shift_name,
                )
                .where(ScheduleShift.shift_date >= week_start)
                .where(ScheduleShift.shift_date < week_end)
                .where(ScheduleShift.staff_id.in_(staff_ids))
                .order_by(ScheduleShift.shift_date, ScheduleShift.shift_name)
            )
            for staff_id, shift_date, shift_name in session.execute(shift_stmt):
                if staff_id is None or shift_date is None:
                    continue
                shift_entry = {
                    "date": shift_date.isoformat(),
                    "day": _weekday_label(shift_date),
                    "shift_name": shift_name,
                }
                shift_map.setdefault(staff_id, []).append(shift_entry)

        staff_entries = []
        total_shifts = 0
        total_hours_accum = 0.0
        for staff in staff_info:
            shifts = shift_map.get(staff["id"], [])
            shift_count = len(shifts)
            total_hours = float(shift_count * SHIFT_DURATION_HOURS)
            total_shifts += shift_count
            total_hours_accum += total_hours

            daily_counter = Counter()
            for shift in shifts:
                daily_counter[shift["date"]] += 1
            daily_counts = []
            for date_key in sorted(daily_counter):
                try:
                    date_obj = date.fromisoformat(date_key)
                except ValueError:
                    date_obj = None
                daily_counts.append(
                    {
                        "date": date_key,
                        "day": _weekday_label(date_obj),
                        "count": int(daily_counter[date_key]),
                    }
                )

            staff_entries.append(
                {
                    "staff_id": staff["id"],
                    "full_name": staff["full_name"],
                    "role": staff["role"],
                    "total_shifts": shift_count,
                    "total_hours": total_hours,
                    "hour_delta_from_average": 0.0,
                    "status": "balanced",
                    "shifts": shifts,
                    "daily_counts": daily_counts,
                }
            )

        people_count = len(staff_entries)
        average_hours = total_hours_accum / people_count if people_count else 0.0

        if people_count:
            upper_threshold = average_hours + HOURS_VARIANCE_THRESHOLD
            lower_threshold = max(0.0, average_hours - HOURS_VARIANCE_THRESHOLD)
            for entry in staff_entries:
                hours = entry["total_hours"]
                entry["hour_delta_from_average"] = _round_hours(hours - average_hours)
                if hours >= MAX_RECOMMENDED_WEEKLY_HOURS:
                    entry["status"] = "overbooked"
                elif average_hours == 0 and hours == 0:
                    entry["status"] = "underbooked"
                elif hours >= upper_threshold and hours > 0:
                    entry["status"] = "overbooked"
                elif hours <= lower_threshold:
                    entry["status"] = "underbooked"
                else:
                    entry["status"] = "balanced"
        else:
            average_hours = 0.0

        staff_entries.sort(key=lambda item: (-item["total_hours"], item["full_name"].lower()))

        for idx, entry in enumerate(staff_entries, start=1):
            entry["rank"] = idx
            entry["total_hours"] = _round_hours(entry["total_hours"])

        overview = {
            "total_people": people_count,
            "total_shifts": total_shifts,
            "total_hours": _round_hours(total_hours_accum),
            "average_hours": _round_hours(average_hours),
            "shift_length_hours": SHIFT_DURATION_HOURS,
            "recommended_max_hours": MAX_RECOMMENDED_WEEKLY_HOURS,
            "generated_at": to_local_iso(_current_local_datetime()),
        }
        if staff_entries:
            overview["max_hours"] = staff_entries[0]["total_hours"]
            overview["min_hours"] = staff_entries[-1]["total_hours"]

        payload = {
            "week": week_info,
            "overview": overview,
            "staff": staff_entries,
        }
        return jsonify(payload)
