# backend/app/auth.py
from flask import Blueprint, request, jsonify
from functools import wraps
from contextlib import contextmanager

from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func, select
from .db import SessionLocal
from .models import Member, Staff

bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

def _json_error(msg, code=400):
    return jsonify({"error": msg}), code

@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def _parse_identity(identity):
    if not identity or not isinstance(identity, str):
        return None, None
    account_type, _, raw_id = identity.partition(":")
    account_type = account_type.strip().lower() or None
    raw_id = raw_id.strip()
    try:
        account_id = int(raw_id) if raw_id else None
    except ValueError:
        account_id = None
    return account_type, account_id

def _get_identity(optional: bool = True):
    """Extract account type and ID from JWT token."""
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
    try:
        verify_jwt_in_request(optional=optional)
    except Exception:
        if optional:
            return None, None, {}
        raise
    identity = get_jwt_identity()
    claims = get_jwt() or {}
    if not identity:
        return None, None, claims
    account_type, account_id = _parse_identity(identity)
    return account_type, account_id, claims

def role_required(*roles):
    allowed_roles = {role.strip().lower() for role in roles if role}

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                return _json_error("authorization required", 401)

            identity = get_jwt_identity()
            account_type, account_id = _parse_identity(identity)
            if account_type != "staff" or account_id is None:
                return _json_error("insufficient permissions", 403)

            claims = get_jwt() or {}
            token_role = (claims.get("role") or "").strip().lower()

            with SessionLocal() as session:
                staff = session.get(Staff, account_id)
                if not staff or not staff.is_active:
                    return _json_error("account disabled", 403)
                db_role = (staff.role or "").strip().lower()

            effective_role = db_role or token_role
            if allowed_roles:
                expanded_roles = set(allowed_roles)
                if "staff" in allowed_roles:
                    expanded_roles.update({"manager", "admin"})
                if "manager" in allowed_roles:
                    expanded_roles.add("admin")

                if not effective_role and token_role:
                    effective_role = token_role

                if effective_role not in expanded_roles:
                    return _json_error("insufficient permissions", 403)

            return fn(*args, **kwargs)

        return wrapper

    return decorator

@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username_input = (data.get("username") or "").strip()
    username_normalized = username_input.lower()
    password = (data.get("password") or "").strip()
    full_name = (data.get("full_name") or "").strip()
    requested_role = (data.get("role") or "customer").strip().lower()

    role = "customer" if requested_role in {"customer", "member"} else requested_role

    if role not in {"customer", "staff", "manager"}:
        return _json_error("invalid role", 400)

    if not password or not full_name:
        return _json_error("password and full_name are required", 400)

    if role == "customer":
        if not email:
            return _json_error("email, password, full_name are required", 400)
    else:
        if not username_input:
            return _json_error("username, password, full_name are required", 400)

    db = SessionLocal()
    try:
        if role == "customer":
            existing_member = db.scalar(select(Member).where(Member.email == email))
            if existing_member:
                return _json_error("email already registered", 409)
        else:
            existing_staff = db.scalar(
                select(Staff).where(func.lower(Staff.username) == username_normalized)
            )
            if existing_staff:
                return _json_error("username already registered", 409)

        if role == "customer":
            account = Member(
                email=email,
                password_hash=generate_password_hash(password),
                full_name=full_name,
            )
            account_type = "member"
        else:
            account = Staff(
                username=username_input,
                password_hash=generate_password_hash(password),
                full_name=full_name,
                role=role,
            )
            account_type = "staff"

        db.add(account)
        db.commit()
        db.refresh(account)
        response_payload = {
            "message": "registered",
            "account_type": account_type,
            "id": account.id,
            "role": role,
        }
        if account_type == "staff":
            response_payload["username"] = account.username
        return jsonify(response_payload), 201
    finally:
        db.close()

@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not (email or username) or not password:
        return _json_error("email or username and password required", 400)

    db = SessionLocal()
    try:
        account_type = None
        resolved_role = None
        account = None

        staff = None
        if username:
            staff = db.scalar(select(Staff).where(func.lower(Staff.username) == username))

        if staff and check_password_hash(staff.password_hash, password):
            account = staff
            account_type = "staff"
            resolved_role = staff.role
        else:
            member = None
            if email:
                member = db.scalar(select(Member).where(func.lower(Member.email) == email))
            if member and check_password_hash(member.password_hash, password):
                account = member
                account_type = "member"
                resolved_role = "customer"

        if not account_type or not account:
            return _json_error("invalid credentials", 401)
        if not account.is_active:
            return _json_error("account disabled", 403)

        identity = f"{account_type}:{account.id}"
        claims = {"role": resolved_role, "name": account.full_name, "account_type": account_type}
        token = create_access_token(identity=identity, additional_claims=claims)

        response_payload = {
            "access_token": token,
            "role": resolved_role or (getattr(account, "role", None) or "customer"),
            "full_name": account.full_name,
            "account_type": account_type,
            "id": account.id,
        }
        if account_type == "staff":
            response_payload["username"] = getattr(account, "username", "")
        else:
            response_payload["email"] = getattr(account, "email", "")

        return jsonify(response_payload)
    finally:
        db.close()


