"""Shared helpers for working with drink customization payloads."""
from __future__ import annotations

import json
from typing import Any


def _clean_label(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def normalize_customizations(raw: Any) -> dict[str, object]:
    """Normalize incoming customization data from a request payload."""
    if not isinstance(raw, dict):
        return {}

    result: dict[str, object] = {}

    if "tea" in raw:
        tea = raw.get("tea")
        if tea is None:
            result["tea"] = None
        else:
            label = str(tea).strip()
            result["tea"] = label or None

    if "milk" in raw:
        milk = raw.get("milk")
        if milk is None:
            result["milk"] = "None"
        else:
            label = str(milk).strip()
            result["milk"] = label or "None"

    if "sugar" in raw:
        sugar = raw.get("sugar")
        if sugar is None:
            result["sugar"] = None
        else:
            label = str(sugar).strip()
            result["sugar"] = label or None

    if "ice" in raw:
        ice = raw.get("ice")
        if ice is None:
            result["ice"] = None
        else:
            label = str(ice).strip()
            result["ice"] = label or None

    if "addons" in raw:
        addons = raw.get("addons")
        cleaned: list[str] = []
        if isinstance(addons, (list, tuple, set)):
            cleaned = [str(item).strip() for item in addons if str(item).strip()]
        elif isinstance(addons, str):
            cleaned = [part.strip() for part in addons.split(",") if part.strip()]
        result["addons"] = cleaned

    return result


def deserialize_customizations(raw: Any) -> dict[str, object]:
    """Convert stored customization JSON into a normalized dictionary."""
    if isinstance(raw, dict):
        return normalize_customizations(raw)
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}

    result: dict[str, object] = {}

    milk = data.get("milk")
    if milk is not None:
        label = str(milk).strip()
        result["milk"] = label or "None"

    sugar = data.get("sugar")
    if sugar is not None:
        label = str(sugar).strip()
        result["sugar"] = label or None

    ice = data.get("ice")
    if ice is not None:
        label = str(ice).strip()
        result["ice"] = label or None

    addons = data.get("addons")
    if isinstance(addons, list):
        result["addons"] = [str(item).strip() for item in addons if str(item).strip()]
    elif isinstance(addons, str):
        result["addons"] = [part.strip() for part in addons.split(",") if part.strip()]

    tea = data.get("tea")
    if tea is not None:
        label = str(tea).strip()
        result["tea"] = label or None

    return result


def extract_inventory_reservations(raw: Any) -> dict[int, int]:
    """Read persisted inventory reservation metadata for an order item."""
    if raw is None:
        return {}

    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except (TypeError, ValueError, json.JSONDecodeError):
            return {}
    elif isinstance(raw, dict):
        data = raw
    else:
        return {}

    payload = data.get("_inventory_reservations")
    reservations: dict[int, int] = {}

    items: list[tuple[object, object]]
    if isinstance(payload, dict):
        items = list(payload.items())
    elif isinstance(payload, list):
        items = []
        for entry in payload:
            if not isinstance(entry, dict):
                continue
            items.append((entry.get("item_id"), entry.get("count")))
    else:
        return {}

    for raw_item_id, raw_count in items:
        try:
            item_id = int(raw_item_id)
        except (TypeError, ValueError):
            continue
        try:
            count = int(raw_count)
        except (TypeError, ValueError):
            continue
        if count <= 0:
            continue
        reservations[item_id] = count

    return reservations


def extract_customization_labels(raw: Any) -> tuple[str | None, str | None, list[str]]:
    """Return cleaned labels for tea, milk, and add-ons for analytics reporting."""
    data = deserialize_customizations(raw)

    tea_label = data.get("tea")
    if tea_label is not None:
        tea_text = str(tea_label).strip()
        tea_label = tea_text if tea_text and tea_text.lower() != "none" else None

    milk_label = data.get("milk")
    if milk_label is not None:
        milk_text = str(milk_label).strip()
        milk_label = milk_text if milk_text and milk_text.lower() != "none" else None

    addon_labels: list[str] = []
    for addon in data.get("addons", []):
        label = str(addon).strip()
        if label and label.lower() != "none":
            addon_labels.append(label)

    return tea_label, milk_label, addon_labels
