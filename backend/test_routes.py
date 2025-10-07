#!/usr/bin/env python3
"""Test script to verify all API endpoints are properly registered."""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import create_app

def test_routes():
    """Test that all expected routes are registered."""
    app = create_app()
    
    # Get all registered routes
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': rule.rule
        })
    
    # Expected v1 API routes
    expected_routes = [
        '/api/v1/health',
        '/api/v1/auth/register',
        '/api/v1/auth/login', 
        '/api/v1/items',
        '/api/v1/items/<int:item_id>/quantity',
        '/api/v1/orders',
        '/api/v1/orders/<int:order_item_id>',
        '/api/v1/rewards',
        '/api/v1/rewards/redeem',
        '/api/v1/rewards/code',
        '/api/v1/schedule',
        '/api/v1/schedule/staff',
        '/api/v1/schedule/<int:shift_id>',
        '/api/v1/analytics/summary',
        '/api/v1/analytics/shifts',
        '/api/v1/admin/accounts',
    ]
    
    print("🔍 Registered API Routes:")
    api_routes = [r for r in routes if r['rule'].startswith('/api/')]
    for route in sorted(api_routes, key=lambda x: x['rule']):
        methods = [m for m in route['methods'] if m not in ['HEAD', 'OPTIONS']]
        print(f"  {route['rule']} - {methods}")
    
    print(f"\n✅ Found {len(api_routes)} API routes")
    
    # Check for missing routes
    found_rules = [r['rule'] for r in api_routes]
    missing = []
    for expected in expected_routes:
        # Check if any registered route matches (accounting for dynamic parts)
        found = False
        for rule in found_rules:
            if expected == rule or (expected.replace('<int:', '<').replace('>', '') in rule):
                found = True
                break
        if not found:
            missing.append(expected)
    
    if missing:
        print(f"\n❌ Missing expected routes: {missing}")
        return False
    else:
        print(f"\n✅ All expected routes are registered!")
        return True

if __name__ == "__main__":
    success = test_routes()
    sys.exit(0 if success else 1)