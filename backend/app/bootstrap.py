"""Database bootstrap utilities."""
from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import inspect, select, func
from werkzeug.security import generate_password_hash

from .db import SessionLocal, engine
from .models import Base, Staff, OrderItem, OrderRecord, MenuItem, Member, ScheduleShift, MemberReward
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
    {
        "email": "member1@example.com", 
        "full_name": "Member One",
        "created_at": datetime(2023, 8, 15, 14, 30, 0)  # August 15, 2023
    },
    {
        "email": "member2@example.com", 
        "full_name": "Member Two",
        "created_at": datetime(2024, 1, 22, 10, 15, 0)  # January 22, 2024
    },
    {
        "email": "member3@example.com", 
        "full_name": "Member Three",
        "created_at": datetime(2024, 3, 8, 16, 45, 0)  # March 8, 2024
    },
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
                created_at=seed["created_at"],
                joined_at=seed["created_at"]
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


def _seed_sample_orders() -> None:
    """Create sample completed orders for testing rewards system and analytics."""
    from datetime import datetime, timedelta
    import json
    import random
    
    with SessionLocal() as session:
        # Clear existing order records to ensure clean data
        session.execute(select(OrderRecord)).scalars().all()
        session.query(OrderRecord).delete()
        
        # Get members - use email to find them since username might be None
        member1 = session.scalar(select(Member).where(Member.email == "member1@example.com"))
        member2 = session.scalar(select(Member).where(Member.email == "member2@example.com"))
        
        if not member1 or not member2:
            return
            
        # Get menu items for creating orders
        green_tea = session.scalar(select(MenuItem).where(MenuItem.name == "Green Tea"))
        black_tea = session.scalar(select(MenuItem).where(MenuItem.name == "Black Tea"))
        oolong_tea = session.scalar(select(MenuItem).where(MenuItem.name == "Oolong Tea"))
        evap_milk = session.scalar(select(MenuItem).where(MenuItem.name == "Evaporated Milk"))
        fresh_milk = session.scalar(select(MenuItem).where(MenuItem.name == "Fresh Milk"))
        oat_milk = session.scalar(select(MenuItem).where(MenuItem.name == "Oat Milk"))
        tapioca = session.scalar(select(MenuItem).where(MenuItem.name == "Tapioca Pearls"))
        taro_balls = session.scalar(select(MenuItem).where(MenuItem.name == "Taro Balls"))
        pudding = session.scalar(select(MenuItem).where(MenuItem.name == "Pudding"))
        
        if not all([green_tea, black_tea, oolong_tea]):
            return
            
        teas = [green_tea, black_tea, oolong_tea]
        milks = [evap_milk, fresh_milk, oat_milk] if all([evap_milk, fresh_milk, oat_milk]) else []
        addons = [tapioca, taro_balls, pudding] if all([tapioca, taro_balls, pudding]) else []
        
        sugar_levels = ["0%", "25%", "50%", "75%", "100%"]
        ice_levels = ["None", "Light", "Normal", "Extra"]
        
        base_time = datetime.now() - timedelta(days=60)  # 60 days ago
        order_id_counter = 2000  # Start with high IDs to avoid conflicts
        
        # Create 15 orders for member1
        for i in range(15):
            tea = random.choice(teas)
            
            # Randomize milk (some orders can have None milk)
            milk_choice = random.choice([None] + milks) if milks else None
            milk_name = milk_choice.name if milk_choice else None
            
            # Randomize add-ons (some orders can have None add-ons)
            addon_choice = random.choice([None] + addons) if addons else None
            addon_names = [addon_choice.name] if addon_choice else []
            
            sugar = random.choice(sugar_levels)
            ice = random.choice(ice_levels)
            
            # Calculate total price
            total_price = tea.price
            if milk_choice:
                total_price += milk_choice.price
            if addon_choice:
                total_price += addon_choice.price
            
            # Create customizations JSON
            customizations = {
                "tea": tea.name,
                "milk": milk_name or "None",
                "sugar": sugar,
                "ice": ice,
                "addons": addon_names
            }
            
            order_time = base_time + timedelta(days=i * 3, hours=random.randint(8, 20), minutes=random.randint(0, 59))
            
            order_record = OrderRecord(
                order_item_id=order_id_counter,
                member_id=member1.id,
                staff_id=None,
                item_id=tea.id,
                qty=1,
                status="complete",
                total_price=total_price,
                customizations=json.dumps(customizations),
                created_at=order_time,
                completed_at=order_time + timedelta(minutes=random.randint(5, 15))
            )
            session.add(order_record)
            order_id_counter += 1
            
        # Create 5 orders for member2
        for i in range(5):
            tea = random.choice(teas)
            
            # Randomize milk (some orders can have None milk)
            milk_choice = random.choice([None] + milks) if milks else None
            milk_name = milk_choice.name if milk_choice else None
            
            # Randomize add-ons (some orders can have None add-ons)
            addon_choice = random.choice([None] + addons) if addons else None
            addon_names = [addon_choice.name] if addon_choice else []
            
            sugar = random.choice(sugar_levels)
            ice = random.choice(ice_levels)
            
            # Calculate total price
            total_price = tea.price
            if milk_choice:
                total_price += milk_choice.price
            if addon_choice:
                total_price += addon_choice.price
            
            # Create customizations JSON
            customizations = {
                "tea": tea.name,
                "milk": milk_name or "None",
                "sugar": sugar,
                "ice": ice,
                "addons": addon_names
            }
            
            order_time = base_time + timedelta(days=i * 8, hours=random.randint(9, 19), minutes=random.randint(0, 59))
            
            order_record = OrderRecord(
                order_item_id=order_id_counter,
                member_id=member2.id,
                staff_id=None,
                item_id=tea.id,
                qty=1,
                status="complete",
                total_price=total_price,
                customizations=json.dumps(customizations),
                created_at=order_time,
                completed_at=order_time + timedelta(minutes=random.randint(5, 15))
            )
            session.add(order_record)
            order_id_counter += 1
            
        session.commit()


def _reset_schedule_schema(connection) -> None:
    inspector = inspect(connection)
    if "schedule_shifts" in inspector.get_table_names():
        connection.exec_driver_sql("DROP TABLE schedule_shifts")


def bootstrap_database() -> None:
    """Create required tables and default records."""
    with engine.begin() as connection:
        _reset_schedule_schema(connection)
        _migrate_members_make_username_nullable(connection)
        _migrate_staff_remove_email(connection)
        Base.metadata.create_all(connection)
    _ensure_menu_item_quantity_column()
    _seed_menu_items()
    _archive_completed_orders()
    _ensure_default_admin()
    _seed_staff_accounts()
    _seed_schedule_shifts()
    _seed_member_accounts()
    _seed_sample_orders()


def _migrate_members_make_username_nullable(connection) -> None:
    """Make username column nullable in members table to support email-only accounts."""
    inspector = inspect(connection)
    if "members" not in inspector.get_table_names():
        return
    
    # Always drop and recreate the members table to ensure correct schema
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


