from flask import Flask, jsonify
from flask_jwt_extended import JWTManager

def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = "change-me"
    JWTManager(app)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app