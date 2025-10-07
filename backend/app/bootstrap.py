"""Database bootstrap utilities."""
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import inspect, select
from werkzeug.security import generate_password_hash

from .db import SessionLocal, engine
from .models import Base, Staff, OrderItem, OrderRecord, MenuItem, Member, ScheduleShift
from .orders import _archive_order

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

SEED_STAFF_ACCOUNTS = [
    {"username": "staff1", "full_name": "Staff One", "role": "staff"},
    {"username": "staff2", "full_name": "Staff Two", "role": "staff"},
]

SEED_MEMBER_ACCOUNTS = [
    {"email": "member1@example.com", "full_name": "Member One"},
    {"email": "member2@example.com", "full_name": "Member Two"},
    {"email": "member3@example.com", "full_name": "Member Three"},
]


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


def _seed_staff_accounts() -> None:
    with SessionLocal() as session:
        for seed in SEED_STAFF_ACCOUNTS:
            existing = session.scalar(select(Staff).where(Staff.username == seed["username"]))
            if existing:
                continue
            staff = Staff(
                username=seed["username"],
                password_hash=generate_password_hash("admin"),
                full_name=seed["full_name"],
                role=seed.get("role", "staff"),
            )
            session.add(staff)
        session.commit()


def _seed_member_accounts() -> None:
    with SessionLocal() as session:
        for seed in SEED_MEMBER_ACCOUNTS:
            existing = session.scalar(select(Member).where(Member.email == seed["email"]))
            if existing:
                continue
            member = Member(
                email=seed["email"],
                password_hash=generate_password_hash("admin"),
                full_name=seed["full_name"],
            )
            session.add(member)
        session.commit()




SCHEDULE_SHIFT_PLAN = [
    (
        "admin",
        (
            (0, ("10:00", "11:00")),
            (2, ("10:00",)),
            (4, ("11:00",)),
        ),
    ),
    (
        "staff1",
        (
            (0, ("12:00", "13:00")),
            (1, ("10:00", "11:00", "12:00")),
            (3, ("14:00", "15:00")),
        ),
    ),
    (
        "staff2",
        (
            (1, ("13:00", "14:00")),
            (2, ("12:00", "13:00")),
            (4, ("10:00", "11:00")),
        ),
    ),
]



def _seed_schedule_shifts() -> None:
    with SessionLocal() as session:
        if session.scalar(select(ScheduleShift.id)):
            return
        staff_rows = session.execute(
            select(Staff).where(Staff.is_active.is_(True))
        ).scalars().all()
        if not staff_rows:
            return
        staff_lookup = {staff.username.lower(): staff for staff in staff_rows}
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        seed_start = week_start + timedelta(days=7)
        for username, assignments in SCHEDULE_SHIFT_PLAN:
            staff = staff_lookup.get(username.lower())
            if not staff:
                continue
            for day_offset, shift_names in assignments:
                shift_date = seed_start + timedelta(days=int(day_offset))
                for shift_name in shift_names:
                    normalized_shift = shift_name.strip()
                    if not normalized_shift:
                        continue
                    existing_shift = session.scalar(
                        select(ScheduleShift)
                        .where(ScheduleShift.staff_id == staff.id)
                        .where(ScheduleShift.shift_date == shift_date)
                        .where(ScheduleShift.shift_name == normalized_shift)
                    )
                    if existing_shift:
                        continue
                    session.add(
                        ScheduleShift(
                            staff_id=staff.id,
                            shift_date=shift_date,
                            shift_name=normalized_shift,
                        )
                    )
        session.commit()

def _archive_completed_orders() -> None:
    """Move lingering completed order_items into order_records."""
    with SessionLocal() as session:
        orders = session.scalars(select(OrderItem).where(OrderItem.status == "complete")).all()
        if not orders:
            return
        for order in orders:
            _archive_order(session, order, account_type=None, account_id=None)
        session.commit()


def _reset_schedule_schema(connection) -> None:
    inspector = inspect(connection)
    if "schedule_shifts" in inspector.get_table_names():
        connection.exec_driver_sql("DROP TABLE schedule_shifts")


def bootstrap_database() -> None:
    """Create required tables and default records."""
    with engine.begin() as connection:
        _reset_schedule_schema(connection)
        _migrate_staff_remove_email(connection)
        Base.metadata.create_all(connection)
    _ensure_menu_item_quantity_column()
    _seed_menu_items()
    _archive_completed_orders()
    _ensure_default_admin()
    _seed_staff_accounts()
    _seed_schedule_shifts()
    _seed_member_accounts()


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


