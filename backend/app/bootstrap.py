"""Database bootstrap utilities."""
from sqlalchemy import inspect, select
from werkzeug.security import generate_password_hash

from .db import SessionLocal, engine
from .models import Base, Staff


def bootstrap_database() -> None:
    """Create required tables and default records."""
    with engine.begin() as connection:
        _migrate_staff_remove_email(connection)
        Base.metadata.create_all(connection)
    _ensure_menu_item_quantity_column()
    _ensure_default_admin()


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
