"""Shared time utility functions."""
from datetime import datetime, timezone


def current_local_datetime() -> datetime:
    """Return the current local datetime with timezone info."""
    return datetime.now(timezone.utc).astimezone()


def to_local_iso(value: datetime | None) -> str | None:
    """Return a local ISO8601 string for the given datetime."""
    if value is None or not isinstance(value, datetime):
        return None
    dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        local_dt = dt.astimezone()
    except (OSError, ValueError):
        local_dt = dt
    return local_dt.isoformat()