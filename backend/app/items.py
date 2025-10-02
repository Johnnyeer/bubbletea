"""Menu item CRUD endpoints."""
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from sqlalchemy import select

from .auth import _json_error, role_required
from .db import SessionLocal
from .models import MenuItem

bp = Blueprint("items", __name__, url_prefix="/api/items")

CURRENCY_STEP = Decimal("0.01")


def _serialize(item: MenuItem) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "price": float(item.price or 0),
        "quantity": int(item.quantity or 0),
        "is_active": bool(item.is_active),
    }


def _parse_price(raw_value) -> Decimal:
    try:
        value = Decimal(str(raw_value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError("price must be a number")
    if value < 0:
        raise ValueError("price must be zero or greater")
    return value.quantize(CURRENCY_STEP)


def _parse_quantity(raw_value) -> int:
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        raise ValueError("quantity must be an integer")
    if value < 0:
        raise ValueError("quantity must be zero or greater")
    return value


@bp.get("")
def list_items():
    with SessionLocal() as session:
        items = session.scalars(select(MenuItem).order_by(MenuItem.category, MenuItem.name)).all()
        return jsonify([_serialize(item) for item in items])


@bp.post("")
@role_required("manager")
def create_item():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    raw_price = data.get("price")
    raw_category = data.get("category")
    category = (str(raw_category).strip() or None) if raw_category is not None else None
    is_active = bool(data.get("is_active", True))
    raw_quantity = data.get("quantity", 0)

    if not name:
        return _json_error("name is required", 400)

    try:
        price = _parse_price(raw_price)
    except ValueError as exc:
        return _json_error(str(exc), 400)
    try:
        quantity = _parse_quantity(raw_quantity)
    except ValueError as exc:
        return _json_error(str(exc), 400)

    with SessionLocal() as session:
        existing = session.scalar(select(MenuItem).where(MenuItem.name == name))
        if existing:
            return _json_error("item with that name already exists", 409)
        item = MenuItem(name=name, category=category, price=price, is_active=is_active, quantity=quantity)
        session.add(item)
        session.commit()
        session.refresh(item)
        return jsonify(_serialize(item)), 201


@bp.get("/<int:item_id>")
def retrieve_item(item_id: int):
    with SessionLocal() as session:
        item = session.get(MenuItem, item_id)
        if not item:
            return _json_error("item not found", 404)
        return jsonify(_serialize(item))


@bp.put("/<int:item_id>")
@role_required("manager", "staff")
def update_item(item_id: int):
    data = request.get_json(silent=True) or {}

    with SessionLocal() as session:
        item = session.get(MenuItem, item_id)
        if not item:
            return _json_error("item not found", 404)

        if "name" in data:
            name = (data.get("name") or "").strip()
            if not name:
                return _json_error("name cannot be empty", 400)
            duplicate = session.scalar(
                select(MenuItem).where(MenuItem.name == name, MenuItem.id != item_id)
            )
            if duplicate:
                return _json_error("item with that name already exists", 409)
            item.name = name

        if "price" in data:
            try:
                item.price = _parse_price(data.get("price"))
            except ValueError as exc:
                return _json_error(str(exc), 400)

        if "category" in data:
            raw_category = data.get("category")
            item.category = (str(raw_category).strip() or None) if raw_category is not None else None

        if "is_active" in data:
            item.is_active = bool(data.get("is_active"))

        session.commit()
        session.refresh(item)
        return jsonify(_serialize(item))


@bp.patch("/<int:item_id>/quantity")
@role_required("manager")
def adjust_quantity(item_id: int):
    data = request.get_json(silent=True) or {}
    if "delta" not in data:
        return _json_error("delta is required", 400)
    try:
        delta = int(data.get("delta"))
    except (TypeError, ValueError):
        return _json_error("delta must be an integer", 400)

    with SessionLocal() as session:
        item = session.get(MenuItem, item_id)
        if not item:
            return _json_error("item not found", 404)
        new_quantity = item.quantity + delta
        if new_quantity < 0:
            return _json_error("quantity cannot be negative", 400)
        item.quantity = new_quantity
        session.commit()
        session.refresh(item)
        return jsonify(_serialize(item))


@bp.delete("/<int:item_id>")
@role_required("manager")
def delete_item(item_id: int):
    with SessionLocal() as session:
        item = session.get(MenuItem, item_id)
        if not item:
            return _json_error("item not found", 404)
        session.delete(item)
        session.commit()
        return jsonify({"message": "deleted"})

