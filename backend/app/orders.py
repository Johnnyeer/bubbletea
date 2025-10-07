import json
from decimal import Decimal, InvalidOperation

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from .models import MemberReward
from sqlalchemy import select, func

bp = Blueprint("orders", __name__, url_prefix="/api/orders")

# Rewards endpoint for member drink count
@bp.get("/rewards")
def get_member_rewards():
    account_type, account_id, _ = _get_identity(optional=True)
    if account_type != "member" or not account_id:
        return jsonify({"error": "Unauthorized"}), 403
    with session_scope() as session:
        # Count completed drinks for this member
        count = session.execute(
            select(func.sum(OrderRecord.qty)).where(OrderRecord.member_id == account_id)
        ).scalar() or 0
    return jsonify({"drink_count": int(count)})

# Redeem reward endpoint
@bp.post("/rewards/redeem")
def redeem_member_reward():
    account_type, account_id, _ = _get_identity(optional=True)
    if account_type != "member" or not account_id:
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json(force=True)
    reward_type = data.get("type")
    # Get drink count
    with session_scope() as session:
        count = session.execute(
            select(func.sum(OrderRecord.qty)).where(OrderRecord.member_id == account_id)
        ).scalar() or 0
        # Check eligibility
        # Check if already redeemed for this milestone
        already_redeemed = session.execute(
            select(MemberReward).where(
                MemberReward.member_id == account_id,
                MemberReward.reward_type == reward_type,
            )
        ).first()
        if reward_type == "free_drink" and count >= 10:
            if already_redeemed:
                return jsonify({"error": "Reward already redeemed."}), 400
            session.add(MemberReward(
                member_id=account_id,
                reward_type=reward_type,
                status="pending"
            ))
            session.commit()
            return jsonify({"success": True})
        elif reward_type == "free_addon" and count >= 5:
            if already_redeemed:
                return jsonify({"error": "Reward already redeemed."}), 400
            session.add(MemberReward(
                member_id=account_id,
                reward_type=reward_type,
                status="pending"
            ))
            session.commit()
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Not eligible for this reward."}), 400
"""Order management endpoints."""
import json
from decimal import Decimal, InvalidOperation

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import select

from .auth import _json_error, _parse_identity, session_scope
from .customizations import deserialize_customizations, extract_inventory_reservations, normalize_customizations
from .models import Member, MenuItem, OrderItem, OrderRecord, ORDER_STATES
ACTIVE_ORDER_STATES = ("received", "preparing")


def _archive_order(
    session,
    order: OrderItem,
    *,
    account_type: str | None = None,
    account_id: int | None = None,
) -> dict:
    """Persist a completed order record and remove the active order item."""
    menu_item = session.get(MenuItem, order.item_id)
    member = session.get(Member, order.member_id) if order.member_id else None
    staff_id = order.staff_id
    if account_type == "staff" and account_id:
        staff_id = account_id

    completed_at = current_local_datetime()

    existing_record = session.scalar(
        select(OrderRecord).where(OrderRecord.order_item_id == order.id)
    )

    if existing_record:
        record = existing_record
    else:
        record = OrderRecord(order_item_id=order.id)
        session.add(record)

    record.member_id = order.member_id
    record.staff_id = staff_id
    record.item_id = order.item_id
    record.qty = order.qty
    record.status = "complete"
    record.total_price = order.total_price
    record.created_at = order.created_at
    record.completed_at = record.completed_at or completed_at
    record.customizations = order.customizations

    session.flush()
    session.delete(order)
    session.flush()

    return _serialize_completed_record(record, menu_item, member)


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


def _serialize_order_item(order: OrderItem, menu_item: MenuItem | None = None, member: Member | None = None):
    customizations = deserialize_customizations(order.customizations)
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

    sugar_label = customizations.get("sugar")
    if sugar_label is not None and not isinstance(sugar_label, str):
        sugar_label = str(sugar_label)
    if isinstance(sugar_label, str):
        sugar_label = sugar_label.strip() or None

    ice_label = customizations.get("ice")
    if ice_label is not None and not isinstance(ice_label, str):
        ice_label = str(ice_label)
    if isinstance(ice_label, str):
        ice_label = ice_label.strip() or None

    options_payload = {
        "tea": tea_label,
        "milk": milk_label or "None",
        "sugar": sugar_label,
        "ice": ice_label,
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


def _serialize_completed_record(record: OrderRecord, menu_item: MenuItem | None = None, member: Member | None = None):
    customizations = deserialize_customizations(record.customizations)
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

    sugar_label = customizations.get("sugar")
    if sugar_label is not None and not isinstance(sugar_label, str):
        sugar_label = str(sugar_label)
    if isinstance(sugar_label, str):
        sugar_label = sugar_label.strip() or None

    ice_label = customizations.get("ice")
    if ice_label is not None and not isinstance(ice_label, str):
        ice_label = str(ice_label)
    if isinstance(ice_label, str):
        ice_label = ice_label.strip() or None

    options_payload = {
        "tea": tea_label,
        "milk": milk_label or "None",
        "sugar": sugar_label,
        "ice": ice_label,
        "addons": addon_labels,
    }

    return {
        "id": record.order_item_id,
        "menu_item_id": record.item_id,
        "name": (menu_item.name if menu_item else None),
        "quantity": record.qty,
        "status": record.status or "complete",
        "total_price": float(record.total_price or 0),
        "created_at": to_local_iso(record.created_at),
        "completed_at": to_local_iso(record.completed_at) if record.completed_at else None,
        "member_id": record.member_id,
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

    raw_id_values = request.args.getlist("ids") or []
    parsed_ids: set[int] = set()
    for value in raw_id_values:
        for segment in str(value).split(","):
            part = segment.strip()
            if not part:
                continue
            try:
                parsed_ids.add(int(part))
            except ValueError:
                continue
    filter_ids = sorted(parsed_ids)

    with session_scope() as session:
        stmt = (
            select(OrderItem, MenuItem, Member)
            .join(MenuItem, MenuItem.id == OrderItem.item_id)
            .join(Member, Member.id == OrderItem.member_id, isouter=True)
            .order_by(OrderItem.created_at.desc())
        )

        if account_type == "member":
            stmt = stmt.where(OrderItem.member_id == account_id)
            if filter_ids:
                stmt = stmt.where(OrderItem.id.in_(filter_ids))
        elif account_type == "staff":
            stmt = stmt.where(OrderItem.status.in_(ACTIVE_ORDER_STATES))
            if filter_ids:
                stmt = stmt.where(OrderItem.id.in_(filter_ids))
        else:
            if not filter_ids:
                return jsonify({"order_items": []})
            stmt = stmt.where(OrderItem.id.in_(filter_ids)).where(OrderItem.member_id.is_(None))

        result_by_id: dict[int, dict] = {}
        for order, menu_item, member in session.execute(stmt).all():
            payload = _serialize_order_item(order, menu_item, member)
            result_by_id[payload["id"]] = payload

        active_ids = set(result_by_id.keys())

        record_stmt = (
            select(OrderRecord, MenuItem, Member)
            .join(MenuItem, MenuItem.id == OrderRecord.item_id)
            .join(Member, Member.id == OrderRecord.member_id, isouter=True)
            .order_by(OrderRecord.completed_at.desc())
        )

        if account_type == "member":
            record_stmt = record_stmt.where(OrderRecord.member_id == account_id)
            if filter_ids:
                record_stmt = record_stmt.where(OrderRecord.order_item_id.in_(filter_ids))
            else:
                record_stmt = record_stmt.limit(200)
        elif account_type == "staff":
            if filter_ids:
                record_stmt = record_stmt.where(OrderRecord.order_item_id.in_(filter_ids))
            else:
                record_stmt = record_stmt.limit(200)
        else:
            record_stmt = record_stmt.where(OrderRecord.order_item_id.in_(filter_ids)).where(OrderRecord.member_id.is_(None))

        include_records = not (account_type == "staff" and not filter_ids)

        if include_records:
            for record, menu_item, member in session.execute(record_stmt).all():
                if record.order_item_id in active_ids:
                    continue
                payload = _serialize_completed_record(record, menu_item, member)
                result_by_id[payload["id"]] = payload

        ordered_payload = sorted(result_by_id.values(), key=lambda item: item.get("created_at") or "", reverse=True)
        return jsonify({"order_items": ordered_payload})


@bp.post("")
def create_order():
    data = request.get_json(silent=True) or {}
    raw_items = data.get("items") or []
    applied_reward = data.get("reward")
    if not isinstance(raw_items, list) or len(raw_items) == 0:
        return _json_error("items must be a non-empty list", 400)

    account_type, account_id, _ = _get_identity(optional=True)
    member_id = account_id if account_type == "member" else None
    staff_id = account_id if account_type == "staff" else None

    order_items: list[tuple[OrderItem, MenuItem]] = []

    with session_scope() as session:
        # If member, check for available reward
        reward_obj = None
        if member_id and applied_reward in {"free_addon", "free_drink"}:
            reward_obj = session.execute(
                select(MemberReward)
                .where(MemberReward.member_id == member_id)
                .where(MemberReward.reward_type == applied_reward)
                .where(MemberReward.status == "pending")
            ).scalar_one_or_none()
        inventory_reservations: dict[int, int] = {}
        tracked_items: dict[int, MenuItem] = {}
        inventory_lookup: dict[tuple[str, str], MenuItem] = {}
        inventory_lookup_loaded = False

        def _normalize_lookup_key(name: str | None, category: str | None) -> tuple[str, str]:
            return ((name or "").strip().lower(), (category or "").strip().lower())

        def _populate_inventory_lookup():
            nonlocal inventory_lookup_loaded
            if inventory_lookup_loaded:
                return
            for candidate in session.scalars(select(MenuItem)):
                inventory_lookup[_normalize_lookup_key(candidate.name, candidate.category)] = candidate
            inventory_lookup_loaded = True

        def _find_inventory_item_by_label(label: object, category_hint: str | None = None) -> MenuItem | None:
            if not isinstance(label, str):
                return None
            value = label.strip()
            if not value or value.lower() == "none":
                return None
            _populate_inventory_lookup()
            key = _normalize_lookup_key(value, category_hint)
            candidate = inventory_lookup.get(key)
            if candidate:
                return candidate
            normalized_value = value.lower()
            for (name_key, _category_key), item in inventory_lookup.items():
                if name_key == normalized_value:
                    return item
            return None

        def reserve_item(item: MenuItem, amount: int, label: str | None = None):
            if item.id not in tracked_items:
                tracked_items[item.id] = item
            if item.quantity is None:
                return None
            pending = inventory_reservations.get(item.id, 0)
            available = item.quantity - pending
            if available < amount:
                name = (label or item.name or "item")
                return _json_error(f"insufficient quantity for {name}", 400)
            inventory_reservations[item.id] = pending + amount
            return None

    for idx, entry in enumerate(raw_items):
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

            error_response = reserve_item(menu_item, quantity, menu_item.name)
            if error_response:
                return error_response

            customizations = normalize_customizations(entry.get("options"))

            extra_counts: dict[int, int] = {}
            raw_inventory_ids = entry.get("inventory_item_ids")
            if raw_inventory_ids:
                if not isinstance(raw_inventory_ids, list):
                    return _json_error("inventory_item_ids must be a list", 400)
                for raw_extra_id in raw_inventory_ids:
                    try:
                        extra_id = int(raw_extra_id)
                    except (TypeError, ValueError):
                        return _json_error("inventory_item_ids must contain integers", 400)
                    if extra_id == menu_item.id:
                        continue
                    extra_counts[extra_id] = extra_counts.get(extra_id, 0) + 1

            if isinstance(customizations, dict):
                milk_candidate = _find_inventory_item_by_label(customizations.get("milk"), "milk")
                if milk_candidate and milk_candidate.id != menu_item.id and milk_candidate.id not in extra_counts:
                    extra_counts[milk_candidate.id] = 1
                addon_labels = customizations.get("addons")
                if isinstance(addon_labels, list):
                    for addon_label in addon_labels:
                        addon_item = _find_inventory_item_by_label(addon_label, "addon")
                        if addon_item and addon_item.id != menu_item.id and addon_item.id not in extra_counts:
                            extra_counts[addon_item.id] = 1

            for extra_id, count in extra_counts.items():
                extra_item = session.get(MenuItem, extra_id)
                if not extra_item or not extra_item.is_active:
                    return _json_error("inventory item not available", 404)
                required_qty = quantity * count
                error_response = reserve_item(extra_item, required_qty, extra_item.name)
                if error_response:
                    return error_response

            if extra_counts:
                customizations["_inventory_reservations"] = [
                    {"item_id": extra_id, "count": count}
                    for extra_id, count in sorted(extra_counts.items())
                    if count > 0
                ]

            unit_price = _coerce_decimal(entry.get("price"), menu_item.price)
            total_price = unit_price * quantity
            # Apply reward: free drink (first item), or free add-on (set add-on price to 0)
            if reward_obj:
                if applied_reward == "free_drink" and idx == 0:
                    total_price = Decimal("0.00")
                elif applied_reward == "free_addon" and customizations.get("addons"):
                    # Set add-on price to 0 (assumes add-ons are priced separately)
                    # You may need to adjust this logic based on your menu/add-on pricing
                    customizations["reward_free_addon"] = True

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

    for item_id, decrease in inventory_reservations.items():
        item = tracked_items.get(item_id)
        if not item or item.quantity is None:
            continue
        item.quantity = max(0, item.quantity - decrease)

    # Mark reward as used if applied
    if reward_obj:
        reward_obj.status = "used"
        session.add(reward_obj)
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

        if account_type == "staff" and account_id:
            order.staff_id = account_id

        if new_status == "complete":
            order.status = new_status
            payload = _archive_order(session, order, account_type=account_type, account_id=account_id)
            session.commit()
            return jsonify(payload)

        order.status = new_status
        session.commit()
        session.refresh(order)

        menu_item = session.get(MenuItem, order.item_id)
        member = session.get(Member, order.member_id) if order.member_id else None
        return jsonify(_serialize_order_item(order, menu_item, member))


@bp.delete("/<int:order_item_id>")
def delete_order(order_item_id: int):
    account_type, account_id, claims = _get_identity(optional=False)
    role = (claims or {}).get("role")
    if role not in {"staff", "manager"}:
        return _json_error("insufficient permissions", 403)

    with session_scope() as session:
        order = session.get(OrderItem, order_item_id)
        if not order:
            return _json_error("order not found", 404)

        reservations = extract_inventory_reservations(order.customizations)

        menu_item = session.get(MenuItem, order.item_id)
        if menu_item and menu_item.quantity is not None:
            base_qty = menu_item.quantity or 0
            restock_amount = order.qty or 0
            if restock_amount > 0:
                menu_item.quantity = base_qty + restock_amount

        for extra_id, per_unit_count in reservations.items():
            if extra_id == order.item_id:
                continue
            extra_item = session.get(MenuItem, extra_id)
            if not extra_item or extra_item.quantity is None:
                continue
            restock_amount = (order.qty or 0) * per_unit_count
            if restock_amount <= 0:
                continue
            current_qty = extra_item.quantity or 0
            extra_item.quantity = current_qty + restock_amount

        session.delete(order)
        session.commit()

    return jsonify({"message": "order deleted"})

