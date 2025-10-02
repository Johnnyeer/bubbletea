"""Analytics endpoints for staff and managers."""
import json
from collections import Counter

from flask import Blueprint, jsonify
from sqlalchemy import func, select

from .auth import role_required
from .db import SessionLocal
from .models import MenuItem, OrderItem, OrderRecord
from .time_utils import to_local_iso

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _clean_label(value):
    if not isinstance(value, str):
        return None
    label = value.strip()
    return label if label else None


def _extract_customizations(raw):
    if not raw:
        return None, None, []
    try:
        data = json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return None, None, []
    if not isinstance(data, dict):
        return None, None, []

    tea_label = _clean_label(data.get("tea"))
    if tea_label and tea_label.lower() == "none":
        tea_label = None

    milk_label = _clean_label(data.get("milk"))
    if milk_label and milk_label.lower() == "none":
        milk_label = None

    addon_entries = data.get("addons")
    addon_labels = []
    if isinstance(addon_entries, list):
        source = addon_entries
    elif isinstance(addon_entries, str):
        source = [part.strip() for part in addon_entries.split(",")]
    else:
        source = []

    for addon in source:
        label = _clean_label(addon)
        if label and label.lower() != "none":
            addon_labels.append(label)

    return tea_label, milk_label, addon_labels


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

        items_sold = []
        total_sold = 0
        for item_id, name, category, quantity_sold in sold_rows:
            qty = int(quantity_sold or 0)
            total_sold += qty
            items_sold.append(
                {
                    "item_id": item_id,
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
            tea_label, milk_label, addon_labels = _extract_customizations(raw)
            if tea_label:
                tea_counter[tea_label] += quantity
            if milk_label:
                milk_counter[milk_label] += quantity
            for addon_label in addon_labels:
                addon_counter[addon_label] += quantity

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

