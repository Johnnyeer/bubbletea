import atexit
import os
import tempfile
from pathlib import Path
import unittest

from sqlalchemy import select

# Ensure tests use an isolated SQLite database
_TEST_DIR = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TEST_DIR.name) / 'inventory_test.db'}"

from backend.app import create_app  # noqa: E402
from backend.app.db import SessionLocal, engine  # noqa: E402
from backend.app.models import Base, MenuItem, OrderItem  # noqa: E402


def _cleanup_tmpdir():
    try:
        engine.dispose()
    finally:
        _TEST_DIR.cleanup()


atexit.register(_cleanup_tmpdir)


class OrderInventoryTests(unittest.TestCase):
    def setUp(self):
        # Recreate schema and seed defaults for each test run
        with engine.begin() as connection:
            Base.metadata.drop_all(connection)
        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        if hasattr(SessionLocal, "remove"):
            SessionLocal.remove()

    def _prime_inventory(self, quantities):
        with SessionLocal() as session:
            records = {}
            for name, value in quantities.items():
                item = session.scalar(select(MenuItem).where(MenuItem.name == name))
                if not item:
                    raise AssertionError(f"Menu item '{name}' not found")
                item.quantity = value
                session.add(item)
                records[name] = item.id
            session.commit()
            return records

    def _fetch_quantity(self, item_id):
        with SessionLocal() as session:
            item = session.get(MenuItem, item_id)
            return item.quantity if item else None

    def _staff_auth_headers(self):
        response = self.client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin'})
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        data = response.get_json() or {}
        token = data.get('access_token')
        self.assertTrue(token, 'expected access token for admin login')
        return {'Authorization': f'Bearer {token}'}

    def test_inventory_decrements_for_successful_order(self):
        ids = self._prime_inventory({
            "Black Tea": 5,
            "Fresh Milk": 5,
            "Tapioca Pearls": 5,
        })

        payload = {
            "items": [
                {
                    "menu_item_id": ids["Black Tea"],
                    "quantity": 2,
                    "price": 5.00,
                    "inventory_item_ids": [ids["Fresh Milk"], ids["Tapioca Pearls"]],
                    "options": {
                        "tea": "Black",
                        "milk": "Fresh Milk",
                        "addons": ["Tapioca Pearls"],
                    },
                }
            ]
        }

        response = self.client.post("/api/orders", json=payload)
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        body = response.get_json()
        self.assertIsNotNone(body)
        self.assertIn("order_items", body)
        self.assertEqual(len(body["order_items"]), 1)

        self.assertEqual(self._fetch_quantity(ids["Black Tea"]), 3)
        self.assertEqual(self._fetch_quantity(ids["Fresh Milk"]), 3)
        self.assertEqual(self._fetch_quantity(ids["Tapioca Pearls"]), 3)

    def test_inventory_unchanged_when_insufficient_stock(self):
        ids = self._prime_inventory({
            "Black Tea": 4,
            "Fresh Milk": 1,
            "Tapioca Pearls": 4,
        })

        payload = {
            "items": [
                {
                    "menu_item_id": ids["Black Tea"],
                    "quantity": 2,
                    "price": 5.00,
                    "inventory_item_ids": [ids["Fresh Milk"], ids["Tapioca Pearls"]],
                    "options": {
                        "tea": "Black",
                        "milk": "Fresh Milk",
                        "addons": ["Tapioca Pearls"],
                    },
                }
            ]
        }

        response = self.client.post("/api/orders", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("insufficient quantity", response.get_data(as_text=True))

        self.assertEqual(self._fetch_quantity(ids["Black Tea"]), 4)
        self.assertEqual(self._fetch_quantity(ids["Fresh Milk"]), 1)
        self.assertEqual(self._fetch_quantity(ids["Tapioca Pearls"]), 4)

    def test_infers_inventory_from_option_labels(self):
        ids = self._prime_inventory({
            "Black Tea": 3,
            "Fresh Milk": 2,
            "Tapioca Pearls": 2,
        })

        payload = {
            "items": [
                {
                    "menu_item_id": ids["Black Tea"],
                    "quantity": 1,
                    "price": 4.50,
                    "options": {
                        "milk": "Fresh Milk",
                        "addons": ["Tapioca Pearls"],
                    },
                }
            ]
        }

        response = self.client.post("/api/orders", json=payload)
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))

        self.assertEqual(self._fetch_quantity(ids["Black Tea"]), 2)
        self.assertEqual(self._fetch_quantity(ids["Fresh Milk"]), 1)
        self.assertEqual(self._fetch_quantity(ids["Tapioca Pearls"]), 1)

    def test_staff_can_delete_order_restores_inventory(self):
        ids = self._prime_inventory({
            "Black Tea": 5,
            "Fresh Milk": 5,
            "Tapioca Pearls": 5,
        })

        payload = {
            "items": [
                {
                    "menu_item_id": ids["Black Tea"],
                    "quantity": 2,
                    "price": 5.00,
                    "inventory_item_ids": [ids["Fresh Milk"], ids["Tapioca Pearls"]],
                    "options": {
                        "tea": "Black",
                        "milk": "Fresh Milk",
                        "addons": ["Tapioca Pearls"],
                    },
                }
            ]
        }

        response = self.client.post("/api/orders", json=payload)
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        body = response.get_json() or {}
        order_items = body.get("order_items") or []
        self.assertEqual(len(order_items), 1)
        order_id = order_items[0]["id"]

        # Ensure inventory decreased after creation
        self.assertEqual(self._fetch_quantity(ids["Black Tea"]), 3)
        self.assertEqual(self._fetch_quantity(ids["Fresh Milk"]), 3)
        self.assertEqual(self._fetch_quantity(ids["Tapioca Pearls"]), 3)

        headers = self._staff_auth_headers()
        delete_response = self.client.delete(f"/api/orders/{order_id}", headers=headers)
        self.assertEqual(delete_response.status_code, 200, delete_response.get_data(as_text=True))

        # Quantities should be restored
        self.assertEqual(self._fetch_quantity(ids["Black Tea"]), 5)
        self.assertEqual(self._fetch_quantity(ids["Fresh Milk"]), 5)
        self.assertEqual(self._fetch_quantity(ids["Tapioca Pearls"]), 5)

        with SessionLocal() as session:
            self.assertIsNone(session.get(OrderItem, order_id))

    def test_delete_requires_staff_authentication(self):
        ids = self._prime_inventory({
            "Black Tea": 4,
            "Fresh Milk": 4,
        })

        payload = {
            "items": [
                {
                    "menu_item_id": ids["Black Tea"],
                    "quantity": 1,
                    "price": 4.00,
                    "options": {
                        "milk": "Fresh Milk",
                    },
                }
            ]
        }

        response = self.client.post("/api/orders", json=payload)
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        order_id = (response.get_json() or {}).get("order_items")[0]["id"]

        unauth_response = self.client.delete(f"/api/orders/{order_id}")
        self.assertEqual(unauth_response.status_code, 401)

        # Inventory should remain decreased because delete failed
        self.assertEqual(self._fetch_quantity(ids["Black Tea"]), 3)
        self.assertEqual(self._fetch_quantity(ids["Fresh Milk"]), 3)


if __name__ == "__main__":
    unittest.main()
