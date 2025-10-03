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



