"""Database bootstrap utilities."""
from decimal import Decimal
from sqlalchemy import inspect, select
from werkzeug.security import generate_password_hash

from .db import SessionLocal, engine
from .models import Base, Staff, MenuItem

SEED_MENU_ITEMS = [
    {"name": "Green Tea", "category": "tea", "price": Decimal("3.50"), "quantity": 100},
    {"name": "Black Tea", "category": "tea", "price": Decimal("3.25"), "quantity": 100},
    {"name": "Oolong Tea", "category": "tea", "price": Decimal("3.75"), "quantity": 100},
    {"name": "Evaporated Milk", "category": "milk", "price": Decimal("0.60"), "quantity": 100},
    {"name": "Fresh Milk", "category": "milk", "price": Decimal("0.70"), "quantity": 100},
    {"name": "Oat Milk", "category": "milk", "price": Decimal("0.80"), "quantity": 100},
    {"name": "Tapioca Pearls", "category": "addon", "price": Decimal("0.50"), "quantity": 200},
    {"name": "Taro Balls", "category": "addon", "price": Decimal("0.55"), "quantity": 200},
    {"name": "Pudding", "category": "addon", "price": Decimal("0.45"), "quantity": 200},
]

# Removed seed data - keeping database simple with just admin and menu items


def _seed_menu_items() -> None:
    with SessionLocal() as session:
        changed = False
        for seed in SEED_MENU_ITEMS:
            existing = session.scalar(
                select(MenuItem)
                .where(MenuItem.name == seed["name"])
                .where(MenuItem.category == seed["category"])
            )
            if existing:
                updated = False
                current_price = Decimal(str(existing.price)) if existing.price is not None else None
                if current_price != seed["price"]:
                    existing.price = seed["price"]
                    updated = True
                if existing.quantity is None or existing.quantity < seed["quantity"]:
                    existing.quantity = seed["quantity"]
                    updated = True
                if existing.is_active is False:
                    existing.is_active = True
                    updated = True
                if updated:
                    changed = True
                continue
            item = MenuItem(
                name=seed["name"],
                category=seed["category"],
                price=seed["price"],
                quantity=seed["quantity"],
                is_active=True,
            )
            session.add(item)
            changed = True
        if changed:
            session.commit()


# Removed seed functions - keeping database simple




# Removed all seed functions - keeping database simple with just admin and menu items



# Removed schedule schema reset - no longer needed


def bootstrap_database() -> None:
    """Create required tables and default records."""
    with engine.begin() as connection:
        _migrate_members_make_username_nullable(connection)
        _migrate_staff_remove_email(connection)
        Base.metadata.create_all(connection)
    _ensure_menu_item_quantity_column()
    _seed_menu_items()
    _ensure_default_admin()


def _migrate_members_make_username_nullable(connection) -> None:
    """Make username column nullable in members table to support email-only accounts."""
    inspector = inspect(connection)
    if "members" not in inspector.get_table_names():
        return
    
    # Check if the username column is already nullable
    columns = inspector.get_columns("members")
    username_column = None
    for col in columns:
        if col['name'] == 'username':
            username_column = col
            break
    
    # Only drop and recreate if username column is not nullable
    if username_column and not username_column.get('nullable', False):
        connection.exec_driver_sql("DROP TABLE IF EXISTS members")
        Base.metadata.tables["members"].create(connection)

def _migrate_staff_remove_email(connection) -> None:
    """Drop the legacy staff.email column while retaining data."""
    inspector = inspect(connection)
    if "staff" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("staff")}
    if "email" not in columns:
        return

    indexes = {index["name"] for index in inspector.get_indexes("staff")}
    if "ix_staff_email" in indexes:
        connection.exec_driver_sql("DROP INDEX IF EXISTS ix_staff_email")
    if "ix_staff_username" in indexes:
        connection.exec_driver_sql("DROP INDEX IF EXISTS ix_staff_username")

    connection.exec_driver_sql("ALTER TABLE staff RENAME TO staff_old")
    Base.metadata.tables["staff"].create(connection)

    transfer_columns = [
        "id",
        "username",
        "password_hash",
        "full_name",
        "role",
        "is_active",
        "hired_at",
    ]
    column_list = ", ".join(transfer_columns)
    connection.exec_driver_sql(
        f"INSERT INTO staff ({column_list}) SELECT {column_list} FROM staff_old"
    )
    connection.exec_driver_sql("DROP TABLE staff_old")


def _ensure_menu_item_quantity_column() -> None:
    """Backfill menu_items.quantity when missing."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        columns = {column["name"] for column in inspector.get_columns("menu_items")}
        if "quantity" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE menu_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0"
            )


def _ensure_default_admin() -> None:
    """Ensure the default admin user exists."""
    with SessionLocal() as session:
        existing = session.scalar(select(Staff).where(Staff.username == "admin"))
        if existing:
            return
        admin = Staff(
            username="admin",
            password_hash=generate_password_hash("admin"),
            full_name="Administrator",
            role="manager",
        )
        session.add(admin)
        session.commit()


def main() -> None:
    """CLI entry point."""
    bootstrap_database()


if __name__ == "__main__":
    main()


