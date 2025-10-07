"""Rewards system endpoints."""
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import select, func
from .auth import session_scope, _get_identity
from .models import MemberReward, OrderRecord, Member

bp = Blueprint("rewards", __name__, url_prefix="/api/v1/rewards")

@bp.get("")
def get_member_rewards():
    """Get member's current reward status."""
    account_type, account_id, _ = _get_identity(optional=True)
    if account_type != "member" or not account_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    with session_scope() as session:
        # Count completed drinks for this member
        count = session.execute(
            select(func.sum(OrderRecord.qty)).where(OrderRecord.member_id == account_id)
        ).scalar() or 0
        
        # Get redeemed rewards
        redeemed_rewards = session.execute(
            select(MemberReward).where(MemberReward.member_id == account_id)
        ).scalars().all()
        
        rewards = []
        for reward in redeemed_rewards:
            rewards.append({
                "id": reward.id,
                "type": reward.reward_type,
                "redeemed_at": reward.redeemed_at.isoformat() if reward.redeemed_at else None
            })
    
    return jsonify({
        "drink_count": int(count),
        "redeemed_rewards": rewards,
        "available_rewards": {
            "free_drink": count >= 10 and not any(r["type"] == "free_drink" for r in rewards)
        }
    })

@bp.post("/redeem")
def redeem_member_reward():
    """Redeem a member reward."""
    account_type, account_id, _ = _get_identity(optional=True)
    if account_type != "member" or not account_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.get_json(force=True)
    reward_type = data.get("type")
    
    if reward_type not in ["free_drink"]:
        return jsonify({"error": "Invalid reward type"}), 400
    
    with session_scope() as session:
        # Count completed drinks for this member
        count = session.execute(
            select(func.sum(OrderRecord.qty)).where(OrderRecord.member_id == account_id)
        ).scalar() or 0
        
        # Check eligibility and if already redeemed
        already_redeemed = session.execute(
            select(MemberReward).where(
                MemberReward.member_id == account_id,
                MemberReward.reward_type == reward_type,
            )
        ).first()
        
        if reward_type == "free_drink":
            if count < 10:
                return jsonify({"error": "Need 10 drinks to redeem free drink"}), 400
            if already_redeemed:
                return jsonify({"error": "Reward already redeemed"}), 400
        
        # Create reward record
        reward = MemberReward(
            member_id=account_id,
            reward_type=reward_type,
            discount_amount=1.0 if reward_type == "free_drink" else 0.0
        )
        session.add(reward)
        session.flush()
        
        return jsonify({
            "id": reward.id,
            "type": reward.reward_type,
            "discount_amount": float(reward.discount_amount),
            "message": "Reward redeemed successfully!"
        }), 201

@bp.post("/code")
@jwt_required()
def apply_reward_code():
    """Apply a reward code for discounts or special offers."""
    account_type, account_id, _ = _get_identity(optional=True)
    if not account_id:
        return jsonify({"error": "Must be logged in to apply reward codes"}), 403
    
    data = request.get_json(force=True)
    code = data.get("code", "").strip().upper()
    
    if not code:
        return jsonify({"error": "Reward code is required"}), 400
    
    # Define available reward codes
    reward_codes = {
        "WELCOME10": {"discount_percent": 10, "description": "Welcome discount"},
        "STUDENT15": {"discount_percent": 15, "description": "Student discount"},
        "LOYALTY20": {"discount_percent": 20, "description": "Loyalty reward"},
        "FREESHIP": {"free_shipping": True, "description": "Free shipping"},
    }
    
    if code not in reward_codes:
        return jsonify({"error": "Invalid reward code"}), 400
    
    reward_info = reward_codes[code]
    
    with session_scope() as session:
        # Check if code was already used by this user
        existing = session.execute(
            select(MemberReward).where(
                MemberReward.member_id == account_id,
                MemberReward.reward_code == code
            )
        ).first()
        
        if existing:
            return jsonify({"error": "Reward code already used"}), 400
        
        # Create reward record
        reward = MemberReward(
            member_id=account_id if account_type == "member" else None,
            reward_type="code_discount",
            reward_code=code,
            discount_percent=reward_info.get("discount_percent", 0),
            discount_amount=0.0,
            description=reward_info["description"]
        )
        session.add(reward)
        session.flush()
        
        return jsonify({
            "reward": {
                "id": reward.id,
                "code": code,
                "type": "code_discount",
                "discount_percent": reward.discount_percent,
                "description": reward.description,
                "message": f"Reward code '{code}' applied successfully!"
            }
        }), 201