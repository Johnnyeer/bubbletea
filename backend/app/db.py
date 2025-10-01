# backend/app/db.py
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.engine import make_url

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_PATH = PROJECT_ROOT / "data" / "app.db"
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"

sqlite_connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    url = make_url(DATABASE_URL)
    database = url.database
    if database and database != ":memory:":
        db_path = Path(database)
        if not db_path.is_absolute():
            db_path = PROJECT_ROOT / db_path
            DATABASE_URL = str(url.set(database=db_path.as_posix()))
        db_path.parent.mkdir(parents=True, exist_ok=True)
    sqlite_connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=sqlite_connect_args,
    pool_pre_ping=True,
    future=True,
)

# SQLite pragmas to ensure integrity without WAL persistence issues
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=DELETE;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()

SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True))
