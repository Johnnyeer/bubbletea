"""Authentication and session endpoints."""
from contextlib import contextmanager
from functools import wraps

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from .db import SessionLocal
from .models import Member, Staff

bp = Blueprint("auth", __name__, url_prefix="/api")


@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _clean_text(value):
    return (value or "").strip()


def _json_error(message, status_code=400):
    return jsonify({"error": message}), status_code


def role_required(*roles):
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


def _parse_identity(raw_identity):
    try:
        account_type, raw_id = str(raw_identity).split(":", 1)
        return account_type, int(raw_id)
    except (ValueError, AttributeError):
        return None, None


@bp.post("/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    email = _clean_text(data.get("email")).lower()
    username = _clean_text(data.get("username"))
    password = _clean_text(data.get("password"))
    full_name = _clean_text(data.get("full_name"))
    requested_role = _clean_text(data.get("role")) or "customer"

    target_role = "customer" if requested_role in {"customer", "member"} else requested_role
    if target_role not in {"customer", "staff", "manager"}:
        return _json_error("invalid role", 400)
    if not password or not full_name:
        return _json_error("full_name and password are required", 400)

    with session_scope() as session:
        if target_role == "customer":
            if not email:
                return _json_error("email is required", 400)
            exists = session.scalar(select(Member).where(Member.email == email))
            if exists:
                return _json_error("email already registered", 409)
            account = Member(
                email=email,
                password_hash=generate_password_hash(password),
                full_name=full_name,
            )
            session.add(account)
            session.commit()
            session.refresh(account)
            return (
                jsonify(
                    {
                        "message": "registered",
                        "account_type": "member",
                        "id": account.id,
                        "role": "customer",
                    }
                ),
                201,
            )

        if not username:
            return _json_error("username is required", 400)
        exists = session.scalar(select(Staff).where(Staff.username == username))
        if exists:
            return _json_error("username already registered", 409)
        account = Staff(
            username=username,
            password_hash=generate_password_hash(password),
            full_name=full_name,
            role=target_role,
        )
        session.add(account)
        session.commit()
        session.refresh(account)
        return (
            jsonify(
                {
                    "message": "registered",
                    "account_type": "staff",
                    "id": account.id,
                    "role": target_role,
                }
            ),
            201,
        )


@bp.post("/admin/accounts")
@role_required("manager")
def create_staff_account():
    data = request.get_json(silent=True) or {}
    full_name = _clean_text(data.get("full_name"))
    username = _clean_text(data.get("username") or data.get("email"))
    password = _clean_text(data.get("password"))
    role = (_clean_text(data.get("role")) or "staff").lower()

    if role not in {"staff", "manager"}:
        return _json_error("role must be staff or manager", 400)
    if not all([full_name, username, password]):
        return _json_error("full_name, username, and password are required", 400)

    with session_scope() as session:
        exists = session.scalar(select(Staff).where(Staff.username == username))
        if exists:
            return _json_error("username already registered", 409)
        account = Staff(
            username=username,
            password_hash=generate_password_hash(password),
            full_name=full_name,
            role=role,
        )
        session.add(account)
        session.commit()
        session.refresh(account)
        return jsonify(
            {
                "id": account.id,
                "full_name": account.full_name,
                "role": account.role,
                "username": account.username,
            }
        ), 201


@bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = _clean_text(data.get("username") or data.get("email"))
    password = _clean_text(data.get("password"))

    if not username or not password:
        return _json_error("username and password are required", 400)

    with session_scope() as session:
        account = session.scalar(select(Staff).where(Staff.username == username))
        account_type = "staff"
        resolved_role = account.role if account else None

        if not account or not check_password_hash(account.password_hash, password):
            account = session.scalar(select(Member).where(Member.email == username.lower()))
            account_type = "member"
            resolved_role = "customer" if account else None

        if not account or not check_password_hash(account.password_hash, password):
            return _json_error("invalid credentials", 401)
        if not account.is_active:
            return _json_error("account disabled", 403)

        identity = f"{account_type}:{account.id}"
        claims = {
            "role": resolved_role,
            "name": account.full_name,
            "account_type": account_type,
        }
        token = create_access_token(identity=identity, additional_claims=claims)
        return jsonify(
            {
                "access_token": token,
                "role": resolved_role,
                "full_name": account.full_name,
                "account_type": account_type,
            }
        )


@bp.get("/me")
@jwt_required()
def me():
    account_type, account_id = _parse_identity(get_jwt_identity())
    if not account_type or account_id is None:
        return _json_error("invalid token identity", 400)

    with session_scope() as session:
        if account_type == "staff":
            account = session.get(Staff, account_id)
            role = account.role if account else None
            timeline_field = "hired_at"
        else:
            account = session.get(Member, account_id)
            role = "customer" if account else None
            timeline_field = "joined_at"

        if not account:
            return _json_error("account not found", 404)

        payload = {
            "id": account.id,
            "full_name": account.full_name,
            "role": role,
            "is_active": account.is_active,
            "account_type": account_type,
            timeline_field: getattr(account, timeline_field),
        }
        if account_type == "staff":
            payload.update({"username": account.username, "email": None})
        else:
            payload.update({"email": account.email})
        return jsonify(payload)


@bp.get("/dashboard/customer")
@role_required("customer", "staff", "manager")
def customer_dashboard():
    claims = get_jwt()
    name = claims.get("name", "guest")
    return jsonify(
        {
            "message": f"Welcome back, {name}!",
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
