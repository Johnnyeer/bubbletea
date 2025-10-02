"""Application factory."""
import os
from decimal import Decimal

from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, jwt_required
from sqlalchemy import inspect, select
from werkzeug.security import generate_password_hash

from .auth import bp as auth_bp
from .db import SessionLocal, engine
from .items import bp as items_bp
from .models import Base, MenuItem, Staff
from .orders import bp as orders_bp
from .schedules import bp as schedules_bp


UNTRACKED_ITEM_NAMES = {"No Milk", "No Add-on"}


DEFAULT_MENU_ITEMS = [
    {"name": "Black Tea", "category": "tea", "price": Decimal("2.00"), "quantity": 100},
    {"name": "Green Tea", "category": "tea", "price": Decimal("2.00"), "quantity": 100},
    {"name": "Oolong Tea", "category": "tea", "price": Decimal("2.00"), "quantity": 100},
    {"name": "Evaporated Milk", "category": "milk", "price": Decimal("0.00"), "quantity": 100},
    {"name": "Fresh Milk", "category": "milk", "price": Decimal("0.20"), "quantity": 100},
    {"name": "Oat Milk", "category": "milk", "price": Decimal("0.20"), "quantity": 100},
    {"name": "Tapioca Pearls", "category": "addon", "price": Decimal("0.50"), "quantity": 100},
    {"name": "Taro Balls", "category": "addon", "price": Decimal("0.50"), "quantity": 100},
    {"name": "Pudding", "category": "addon", "price": Decimal("0.50"), "quantity": 100},
]


def _ensure_default_admin():
    """Create a simple admin user if none exists."""
    with SessionLocal() as session:
        existing = session.scalar(select(Staff).where(Staff.username == "admin"))
        if existing:
            return
        admin = Staff(
            username="admin",
            password_hash=generate_password_hash("admin"),
            full_name="Administrator",
            role="manager",
        )
        session.add(admin)
        session.commit()


def _ensure_menu_item_quantity_column():
    """Ensure the menu_items table includes the quantity column."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        columns = {column["name"] for column in inspector.get_columns("menu_items")}
        if "quantity" not in columns:
            connection.exec_driver_sql("ALTER TABLE menu_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0")


def _ensure_menu_item_category_column():
    """Ensure the menu_items table includes the category column."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        columns = {column["name"] for column in inspector.get_columns("menu_items")}
        if "category" not in columns:
            connection.exec_driver_sql("ALTER TABLE menu_items ADD COLUMN category VARCHAR(50)")


def _ensure_order_item_customizations_column():
    """Ensure the order_items table includes the customizations column."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        columns = {column["name"] for column in inspector.get_columns("order_items")}
        if "customizations" not in columns:
            connection.exec_driver_sql("ALTER TABLE order_items ADD COLUMN customizations TEXT")


def _ensure_default_menu_items():
    """Ensure the default bubble tea menu items exist with expected pricing."""
    valid_names = {item["name"] for item in DEFAULT_MENU_ITEMS}

    with SessionLocal() as session:
        for item_data in DEFAULT_MENU_ITEMS:
            existing = session.scalar(select(MenuItem).where(MenuItem.name == item_data["name"]))
            if existing:
                updated = False
                if existing.category != item_data["category"]:
                    existing.category = item_data["category"]
                    updated = True
                if existing.price != item_data["price"]:
                    existing.price = item_data["price"]
                    updated = True
                if existing.quantity != item_data["quantity"]:
                    existing.quantity = item_data["quantity"]
                    updated = True
                if existing.is_active is False:
                    existing.is_active = True
                    updated = True
                if updated:
                    session.add(existing)
                continue
            session.add(MenuItem(**item_data, is_active=True))

        extras = session.scalars(select(MenuItem).where(MenuItem.name.notin_(valid_names))).all()
        for extra in extras:
            if extra.is_active:
                extra.is_active = False
                session.add(extra)

        placeholders = session.scalars(select(MenuItem).where(MenuItem.name.in_(UNTRACKED_ITEM_NAMES))).all()
        for placeholder in placeholders:
            session.delete(placeholder)

        session.commit()


def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me")

    JWTManager(app)

    with engine.begin() as connection:
        Base.metadata.create_all(connection)
    _ensure_menu_item_quantity_column()
    _ensure_menu_item_category_column()
    _ensure_order_item_customizations_column()
    _ensure_default_admin()
    _ensure_default_menu_items()

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    @app.get("/api/protected")
    @jwt_required()
    def protected_route():
        return jsonify({"ok": True})

    app.register_blueprint(auth_bp)
    app.register_blueprint(items_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(schedules_bp)

    return app
