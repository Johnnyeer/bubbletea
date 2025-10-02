"""Order management endpoints."""
import json
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import select

from .auth import _json_error, _parse_identity, session_scope
from .models import Member, MenuItem, OrderItem, ORDER_STATES
from .time_utils import current_local_datetime, to_local_iso


bp = Blueprint("orders", __name__, url_prefix="/api/orders")


def _normalize_customizations(raw) -> dict:
    """Normalize incoming customization payload for persistence."""
    if not isinstance(raw, dict):
        return {}

    result: dict[str, object] = {}

    if "tea" in raw:
        tea = raw.get("tea")
        if tea is None:
            result["tea"] = None
        else:
            label = str(tea).strip()
            result["tea"] = label or None

    if "milk" in raw:
        milk = raw.get("milk")
        if milk is None:
            result["milk"] = "None"
        else:
            label = str(milk).strip()
            result["milk"] = label or "None"

    if "addons" in raw:
        addons = raw.get("addons")
        cleaned: list[str] = []
        if isinstance(addons, (list, tuple, set)):
            cleaned = [str(item).strip() for item in addons if str(item).strip()]
        elif isinstance(addons, str):
            cleaned = [part.strip() for part in addons.split(",") if part.strip()]
        result["addons"] = cleaned

    return result


def _deserialize_customizations(raw: str | None) -> dict:
    """Convert stored customization JSON to a safe dictionary."""
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}

    result: dict[str, object] = {}

    milk = data.get("milk")
    if milk is not None:
        label = str(milk).strip()
        result["milk"] = label or "None"

    addons = data.get("addons")
    if isinstance(addons, list):
        result["addons"] = [str(item).strip() for item in addons if str(item).strip()]
    elif isinstance(addons, str):
        result["addons"] = [part.strip() for part in addons.split(",") if part.strip()]

    tea = data.get("tea")
    if tea is not None:
        label = str(tea).strip()
        result["tea"] = label or None

    return result


def _serialize_order_item(order: OrderItem, menu_item: MenuItem | None = None, member: Member | None = None):
    customizations = _deserialize_customizations(order.customizations)
    milk_label = customizations.get("milk")
    if milk_label is None or (isinstance(milk_label, str) and milk_label.strip() == ""):
        milk_label = "None"
    elif isinstance(milk_label, str):
        milk_label = milk_label.strip()
    else:
        milk_label = str(milk_label)

    addon_labels = customizations.get("addons")
    if not isinstance(addon_labels, list):
        addon_labels = []
    else:
        addon_labels = [label for label in (str(item).strip() for item in addon_labels) if label]

    tea_label = customizations.get("tea")
    if tea_label is not None and not isinstance(tea_label, str):
        tea_label = str(tea_label)

    options_payload = {
        "tea": tea_label,
        "milk": milk_label or "None",
        "addons": addon_labels,
    }

    return {
        "id": order.id,
        "menu_item_id": order.item_id,
        "name": (menu_item.name if menu_item else None),
        "quantity": order.qty,
        "status": order.status,
        "total_price": float(order.total_price or 0),
        "created_at": to_local_iso(order.created_at),
        "member_id": order.member_id,
        "member_name": member.full_name if member else None,
        "options": options_payload,
    }


def _get_identity(optional: bool = True):
    try:
        verify_jwt_in_request(optional=optional)
    except Exception:
        if optional:
            return None, None, {}
        raise
    identity = get_jwt_identity()
    claims = get_jwt() or {}
    if not identity:
        return None, None, claims
    account_type, account_id = _parse_identity(identity)
    return account_type, account_id, claims


def _coerce_decimal(value, fallback: Decimal) -> Decimal:
    if value is None:
        return fallback
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return fallback


@bp.get("")
def list_orders():
    account_type, account_id, _ = _get_identity(optional=True)

    if account_type is None:
        # Guests have no persisted order history; return an empty collection.
        return jsonify({"order_items": []})

    with session_scope() as session:
        stmt = (
            select(OrderItem, MenuItem, Member)
            .join(MenuItem, MenuItem.id == OrderItem.item_id)
            .join(Member, Member.id == OrderItem.member_id, isouter=True)
            .order_by(OrderItem.created_at.desc())
        )

        if account_type == "member":
            stmt = stmt.where(OrderItem.member_id == account_id)
        elif account_type == "staff":
            # staff can view all orders; no filter needed
            stmt = stmt.limit(200)

        rows = session.execute(stmt).all()
        payload = [_serialize_order_item(order, menu_item, member) for order, menu_item, member in rows]
        return jsonify({"order_items": payload})


@bp.post("")
def create_order():
    data = request.get_json(silent=True) or {}
    raw_items = data.get("items") or []
    if not isinstance(raw_items, list) or len(raw_items) == 0:
        return _json_error("items must be a non-empty list", 400)

    account_type, account_id, _ = _get_identity(optional=True)
    member_id = account_id if account_type == "member" else None
    staff_id = account_id if account_type == "staff" else None

    order_items: list[tuple[OrderItem, MenuItem]] = []

    with session_scope() as session:
        for entry in raw_items:
            if not isinstance(entry, dict):
                return _json_error("each item must be an object", 400)

            menu_item_id = entry.get("menu_item_id") or entry.get("item_id") or entry.get("id")
            if not menu_item_id:
                return _json_error("menu_item_id is required for each item", 400)

            try:
                menu_item_id = int(menu_item_id)
            except (TypeError, ValueError):
                return _json_error("menu_item_id must be an integer", 400)

            quantity_raw = entry.get("quantity") or entry.get("qty") or 1
            try:
                quantity = int(quantity_raw)
            except (TypeError, ValueError):
                return _json_error("quantity must be an integer", 400)
            if quantity <= 0:
                return _json_error("quantity must be greater than zero", 400)

            menu_item = session.get(MenuItem, menu_item_id)
            if not menu_item or not menu_item.is_active:
                return _json_error("menu item not available", 404)

            if menu_item.quantity is not None and menu_item.quantity < quantity:
                return _json_error(f"insufficient quantity for {menu_item.name}", 400)

            extra_adjustments = []
            raw_inventory_ids = entry.get("inventory_item_ids")
            if raw_inventory_ids:
                if not isinstance(raw_inventory_ids, list):
                    return _json_error("inventory_item_ids must be a list", 400)
                extra_counts = {}
                for raw_extra_id in raw_inventory_ids:
                    try:
                        extra_id = int(raw_extra_id)
                    except (TypeError, ValueError):
                        return _json_error("inventory_item_ids must contain integers", 400)
                    if extra_id == menu_item.id:
                        continue
                    extra_counts[extra_id] = extra_counts.get(extra_id, 0) + 1

                for extra_id, count in extra_counts.items():
                    extra_item = session.get(MenuItem, extra_id)
                    if not extra_item or not extra_item.is_active:
                        return _json_error("inventory item not available", 404)
                    required_qty = quantity * count
                    if extra_item.quantity is not None and extra_item.quantity < required_qty:
                        return _json_error(f"insufficient quantity for {extra_item.name}", 400)
                    extra_adjustments.append((extra_item, required_qty))

            unit_price = _coerce_decimal(entry.get("price"), menu_item.price)
            total_price = unit_price * quantity

            customizations = _normalize_customizations(entry.get("options"))
            customizations_json = json.dumps(customizations) if customizations else None

            order_item = OrderItem(
                item_id=menu_item.id,
                qty=quantity,
                total_price=total_price,
                member_id=member_id,
                staff_id=staff_id,
                created_at=current_local_datetime(),
                customizations=customizations_json,
            )
            session.add(order_item)
            order_items.append((order_item, menu_item))

            if menu_item.quantity is not None:
                menu_item.quantity = max(0, menu_item.quantity - quantity)
            for extra_item, decrease_amount in extra_adjustments:
                if extra_item.quantity is not None:
                    extra_item.quantity = max(0, extra_item.quantity - decrease_amount)

        session.commit()

        response_items = []
        for order_item, menu_item in order_items:
            session.refresh(order_item)
            member = session.get(Member, order_item.member_id) if order_item.member_id else None
            response_items.append(_serialize_order_item(order_item, menu_item, member))

    return jsonify({"message": "order created", "order_items": response_items}), 201


@bp.patch("/<int:order_item_id>")
def update_order(order_item_id: int):
    account_type, account_id, claims = _get_identity(optional=False)
    role = (claims or {}).get("role")
    if role not in {"staff", "manager"}:
        return _json_error("insufficient permissions", 403)

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip().lower()
    if new_status not in ORDER_STATES:
        valid = ", ".join(ORDER_STATES)
        return _json_error(f"status must be one of: {valid}", 400)

    with session_scope() as session:
        order = session.get(OrderItem, order_item_id)
        if not order:
            return _json_error("order not found", 404)

        order.status = new_status
        if account_type == "staff" and account_id:
            order.staff_id = account_id

        session.commit()
        session.refresh(order)

        menu_item = session.get(MenuItem, order.item_id)
        member = session.get(Member, order.member_id) if order.member_id else None
        return jsonify(_serialize_order_item(order, menu_item, member))

