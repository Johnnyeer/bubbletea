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
from .models import Member, Staff

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
    requested_role = (data.get("role") or "customer").strip().lower()

    role = "customer" if requested_role in {"customer", "member"} else requested_role

    if not email or not password or not full_name:
        return _json_error("email, password, full_name are required", 400)
    if role not in {"customer", "staff", "manager"}:
        return _json_error("invalid role", 400)

    db = SessionLocal()
    try:
        existing_member = db.scalar(select(Member).where(Member.email == email))
        existing_staff = db.scalar(select(Staff).where(Staff.email == email))
        if existing_member or existing_staff:
            return _json_error("email already registered", 409)

        if role == "customer":
            account = Member(
                email=email,
                password_hash=generate_password_hash(password),
                full_name=full_name,
            )
            account_type = "member"
        else:
            account = Staff(
                email=email,
                password_hash=generate_password_hash(password),
                full_name=full_name,
                role=role,
            )
            account_type = "staff"

        db.add(account)
        db.commit()
        db.refresh(account)
        return (
            jsonify(
                {
                    "message": "registered",
                    "account_type": account_type,
                    "id": account.id,
                    "role": role,
                }
            ),
            201,
        )
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
        account = db.scalar(select(Staff).where(Staff.email == email))
        account_type = None
        resolved_role = None

        if account and check_password_hash(account.password_hash, password):
            account_type = "staff"
            resolved_role = account.role
        else:
            account = db.scalar(select(Member).where(Member.email == email))
            if account and check_password_hash(account.password_hash, password):
                account_type = "member"
                resolved_role = "customer"

        if not account_type or not account:
            return _json_error("invalid credentials", 401)
        if not account.is_active:
            return _json_error("account disabled", 403)

        identity = f"{account_type}:{account.id}"
        claims = {"role": resolved_role, "name": account.full_name, "account_type": account_type}
        token = create_access_token(identity=identity, additional_claims=claims)
        return jsonify(
            {
                "access_token": token,
                "role": resolved_role,
                "full_name": account.full_name,
                "account_type": account_type,
            }
        )
    finally:
        db.close()


@bp.get("/me")
@jwt_required()
def me():
    raw_identity = get_jwt_identity() or ""
    try:
        account_type, account_id = str(raw_identity).split(":", 1)
        account_id_int = int(account_id)
    except (ValueError, AttributeError):
        return _json_error("invalid token identity", 400)

    db = SessionLocal()
    try:
        if account_type == "staff":
            account = db.get(Staff, account_id_int)
            role = account.role if account else None
            timeline_field = "hired_at"
        else:
            account = db.get(Member, account_id_int)
            role = "customer" if account else None
            timeline_field = "joined_at"

        if not account:
            return _json_error("account not found", 404)

        return jsonify(
            {
                "id": account.id,
                "email": account.email,
                "full_name": account.full_name,
                "role": role,
                "is_active": account.is_active,
                "account_type": account_type,
                timeline_field: getattr(account, timeline_field),
            }
        )
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
