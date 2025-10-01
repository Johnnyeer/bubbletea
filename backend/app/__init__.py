"""Application factory."""
import os

from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, jwt_required
from sqlalchemy import inspect, select
from werkzeug.security import generate_password_hash

from .auth import bp as auth_bp
from .db import SessionLocal, engine
from .items import bp as items_bp
from .models import Base, Staff
from .orders import bp as orders_bp
from .schedules import bp as schedules_bp


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

def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me")

    JWTManager(app)

    with engine.begin() as connection:
        Base.metadata.create_all(connection)
    _ensure_menu_item_quantity_column()
    _ensure_default_admin()

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
