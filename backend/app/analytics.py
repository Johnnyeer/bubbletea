"""Analytics endpoints for staff and managers."""
from collections import Counter

from datetime import datetime, timezone

from flask import Blueprint, jsonify
from sqlalchemy import func, select

from .auth import role_required
from .customizations import extract_customization_labels
from .db import SessionLocal
from .models import MenuItem, OrderItem, OrderRecord
bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


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


def _format_popular_entry(counter):
    if not counter:
        return None
    label, count = counter.most_common(1)[0]
    return {"label": label, "count": int(count)}


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

