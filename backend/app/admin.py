"""Admin endpoints for user management."""
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from sqlalchemy import select
from .auth import role_required, session_scope, _get_identity
from .models import Staff, Member

bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")

@bp.post("/accounts")
@jwt_required()
@role_required("admin", "manager")
def create_team_account():
    """Create a new staff or member account."""
    data = request.get_json(force=True)
    
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    account_type = data.get("account_type", "").strip().lower()
    role = data.get("role", "staff").strip().lower()
    
    if not all([username, password, full_name]):
        return jsonify({"error": "Username, password, and full name are required"}), 400
    
    if account_type not in ["staff", "member"]:
        return jsonify({"error": "Account type must be 'staff' or 'member'"}), 400
    
    if account_type == "staff" and role not in ["staff", "manager", "admin"]:
        return jsonify({"error": "Staff role must be 'staff', 'manager', or 'admin'"}), 400
    
    with session_scope() as session:
        # Check if username already exists
        if account_type == "staff":
            existing = session.scalar(select(Staff).where(Staff.username == username))
        else:
            existing = session.scalar(select(Member).where(Member.username == username))
            
        if existing:
            return jsonify({"error": "Username already exists"}), 400
        
        # Create the account
        password_hash = generate_password_hash(password)
        
        if account_type == "staff":
            new_account = Staff(
                username=username,
                password_hash=password_hash,
                full_name=full_name,
                role=role
            )
        else:
            new_account = Member(
                username=username,
                password_hash=password_hash,
                full_name=full_name
            )
        
        session.add(new_account)
        session.flush()  # Get the ID
        
        return jsonify({
            "id": new_account.id,
            "username": username,
            "full_name": full_name,
            "account_type": account_type,
            "role": role if account_type == "staff" else None
        }), 201

@bp.get("/accounts")
@jwt_required()
@role_required("admin", "manager")
def list_accounts():
    """List all accounts for admin management."""
    with session_scope() as session:
        staff_accounts = session.execute(select(Staff)).scalars().all()
        member_accounts = session.execute(select(Member)).scalars().all()
        
        accounts = []
        
        for staff in staff_accounts:
            accounts.append({
                "id": staff.id,
                "username": staff.username,
                "full_name": staff.full_name,
                "account_type": "staff",
                "role": staff.role,
                "created_at": staff.created_at.isoformat() if staff.created_at else None
            })
        
        for member in member_accounts:
            accounts.append({
                "id": member.id,
                "username": member.username,
                "full_name": member.full_name,
                "account_type": "member",
                "role": None,
                "created_at": member.created_at.isoformat() if member.created_at else None
            })
        
        return jsonify({"accounts": accounts})