# backend/app/auth.py
from flask import Blueprint, request, jsonify
from functools import wraps

from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import select
from .db import SessionLocal
from .models import User

bp = Blueprint("auth", __name__, url_prefix="/api")

def _json_error(msg, code=400):
    return jsonify({"error": msg}), code


def role_required(*roles):
    """Ensure the current JWT belongs to one of the provided roles."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt() or {}
            if claims.get("role") not in roles:
                return _json_error("insufficient permissions", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator

@bp.post("/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    full_name = (data.get("full_name") or "").strip()
    role = (data.get("role") or "customer").strip().lower()

    if not email or not password or not full_name:
        return _json_error("email, password, full_name are required", 400)
    if role not in {"customer", "staff", "manager"}:
        return _json_error("invalid role", 400)

    db = SessionLocal()
    try:
        exists = db.scalar(select(User).where(User.email == email))
        if exists:
            return _json_error("email already registered", 409)

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            full_name=full_name,
            role=role,
        )
        db.add(user)
        db.commit()
        return jsonify({"message": "registered", "user_id": user.id}), 201
    finally:
        db.close()

@bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return _json_error("email and password required", 400)

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if not user or not check_password_hash(user.password_hash, password):
            return _json_error("invalid credentials", 401)
        if not user.is_active:
            return _json_error("account disabled", 403)

        claims = {"role": user.role, "name": user.full_name}
        token = create_access_token(identity=str(user.id), additional_claims=claims)
        return jsonify({"access_token": token, "role": user.role, "full_name": user.full_name})
    finally:
        db.close()

@bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        user = db.get(User, int(user_id))
        if not user:
            return _json_error("user not found", 404)
        return jsonify({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active
        })
    finally:
        db.close()


@bp.get("/dashboard/customer")
@role_required("customer", "staff", "manager")
def customer_dashboard():
    """Simple data payload accessible to any authenticated user."""

    claims = get_jwt()
    return jsonify(
        {
            "message": f"Welcome back, {claims.get('name', 'guest')}!",
            "available_actions": [
                "Browse menu",
                "Place new order",
                "Review past orders",
            ],
        }
    )


@bp.get("/dashboard/staff")
@role_required("staff", "manager")
def staff_dashboard():
    """Data relevant to on-shift staff members."""

    return jsonify(
        {
            "message": "Staff dashboard",
            "available_actions": [
                "Update order status",
                "Check ingredient inventory",
                "Review today's schedule",
            ],
        }
    )


@bp.get("/dashboard/manager")
@role_required("manager")
def manager_dashboard():
    """Manager-only operational insights."""

    return jsonify(
        {
            "message": "Manager analytics overview",
            "available_actions": [
                "View revenue analytics",
                "Assign staff shifts",
                "Approve menu updates",
            ],
        }
    )
