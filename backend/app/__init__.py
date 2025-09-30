# backend/app/__init__.py
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
import os

from .db import engine
from .models import Base
from .auth import bp as auth_bp
from .items import bp as items_bp

def create_app():
    app = Flask(__name__)

    # Secrets/config
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me")

    # JWT
    JWTManager(app)

    # Create tables on first run (simple & fine for SQLite)
    with engine.begin() as conn:
        Base.metadata.create_all(conn)

    # Health
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # Auth routes
    app.register_blueprint(auth_bp)

    # Example protected route (role-agnostic)
    from flask_jwt_extended import jwt_required
    @app.get("/api/protected")
    @jwt_required()
    def protected():
        return jsonify({"ok": True})

    return app
