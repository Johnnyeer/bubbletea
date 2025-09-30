"""CRUD routes for menu items."""
from flask import Blueprint, jsonify, request
from sqlalchemy import select

from .auth import _json_error, role_required
from .db import SessionLocal
from .models import Item

bp = Blueprint("items", __name__, url_prefix="/api/items")


def _serialize(item: Item) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "price_cents": item.price_cents,
        "is_active": item.is_active,
    }


@bp.get("")
def list_items():
    """Return all menu items."""
    db = SessionLocal()
    try:
        items = db.scalars(select(Item).order_by(Item.name)).all()
        return jsonify([_serialize(item) for item in items])
    finally:
        db.close()


@bp.post("")
@role_required("manager", "staff")
def create_item():
    """Create a new menu item."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    price_cents = data.get("price_cents")
    is_active = bool(data.get("is_active", True))

    if not name:
        return _json_error("name is required", 400)
    try:
        price_cents = int(price_cents)
    except (TypeError, ValueError):
        return _json_error("price_cents must be an integer", 400)
    if price_cents < 0:
        return _json_error("price_cents must be >= 0", 400)

    db = SessionLocal()
    try:
        exists = db.scalar(select(Item).where(Item.name == name))
        if exists:
            return _json_error("item with that name already exists", 409)
        item = Item(name=name, price_cents=price_cents, is_active=is_active)
        db.add(item)
        db.commit()
        db.refresh(item)
        return jsonify(_serialize(item)), 201
    finally:
        db.close()


@bp.get("/<int:item_id>")
def retrieve_item(item_id: int):
    """Fetch a single menu item."""
    db = SessionLocal()
    try:
        item = db.get(Item, item_id)
        if not item:
            return _json_error("item not found", 404)
        return jsonify(_serialize(item))
    finally:
        db.close()


@bp.put("/<int:item_id>")
@role_required("manager", "staff")
def update_item(item_id: int):
    """Replace the item with the supplied payload."""
    data = request.get_json(silent=True) or {}

    db = SessionLocal()
    try:
        item = db.get(Item, item_id)
        if not item:
            return _json_error("item not found", 404)

        name = data.get("name")
        if name is not None:
            name = name.strip()
            if not name:
                return _json_error("name cannot be empty", 400)
            duplicate = db.scalar(
                select(Item).where(Item.name == name, Item.id != item_id)
            )
            if duplicate:
                return _json_error("item with that name already exists", 409)
            item.name = name

        if "price_cents" in data:
            try:
                price_cents = int(data["price_cents"])
            except (TypeError, ValueError):
                return _json_error("price_cents must be an integer", 400)
            if price_cents < 0:
                return _json_error("price_cents must be >= 0", 400)
            item.price_cents = price_cents

        if "is_active" in data:
            item.is_active = bool(data["is_active"])

        db.commit()
        db.refresh(item)
        return jsonify(_serialize(item))
    finally:
        db.close()


@bp.delete("/<int:item_id>")
@role_required("manager")
def delete_item(item_id: int):
    """Remove an item from the menu."""
    db = SessionLocal()
    try:
        item = db.get(Item, item_id)
        if not item:
            return _json_error("item not found", 404)
        db.delete(item)
        db.commit()
        return jsonify({"message": "deleted"})
    finally:
        db.close()
