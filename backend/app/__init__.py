"""Application factory."""
import os

from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, jwt_required

from .analytics import bp as analytics_bp
from .auth import bp as auth_bp
from .items import bp as items_bp
from .orders import bp as orders_bp
from .schedules import bp as schedules_bp


def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me")

    JWTManager(app)

    from .bootstrap import bootstrap_database

    bootstrap_database()

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
    app.register_blueprint(analytics_bp)

    return app
