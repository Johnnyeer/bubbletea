"""Helpers for working with localized datetimes."""
from __future__ import annotations

from datetime import datetime, timezone


def current_local_datetime() -> datetime:
    """Return the current local datetime with timezone information."""
    return datetime.now().astimezone()


def to_local_iso(value: datetime | None) -> str | None:
    """Return an ISO8601 string in the local timezone for the given datetime."""
    if value is None:
        return None
    if not isinstance(value, datetime):
        return None
    dt = value
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    try:
        local_dt = dt.astimezone()
    except (OSError, ValueError):
        local_dt = dt
    return local_dt.isoformat()
