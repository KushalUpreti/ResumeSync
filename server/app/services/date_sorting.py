from __future__ import annotations

import re
from typing import Any, Sequence, TypeVar

T = TypeVar("T")

_MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

_MONTH_YEAR_PATTERN = re.compile(
    r"^(?P<month>[A-Za-z]{3,9})\.?\s+(?P<year>\d{4})$",
    re.IGNORECASE,
)
_MONTH_SLASH_YEAR_PATTERN = re.compile(
    r"^(?P<month>\d{1,2})/(?P<year>\d{4})$",
)
_YEAR_PATTERN = re.compile(r"^(?P<year>\d{4})$")


def sort_experience_entries(entries: Sequence[T]) -> list[T]:
    return sort_entries_by_dates(entries, ("end_date", "start_date"))


def sort_education_entries(entries: Sequence[T]) -> list[T]:
    return sort_entries_by_dates(entries, ("end_date", "start_date"))


def sort_project_entries(entries: Sequence[T]) -> list[T]:
    return sort_entries_by_dates(entries, ("end_date", "start_date"))


def sort_certification_entries(entries: Sequence[T]) -> list[T]:
    return sort_entries_by_dates(entries, ("date_obtained",))


def sort_entries_by_dates(entries: Sequence[T], field_names: Sequence[str]) -> list[T]:
    indexed_entries = list(enumerate(entries))
    indexed_entries.sort(key=lambda item: _entry_sort_key(item[1], field_names), reverse=True)
    return [entry for _, entry in indexed_entries]


def _entry_sort_key(entry: Any, field_names: Sequence[str]) -> tuple[int, int, int, int]:
    for field_name in field_names:
        value = _get_field(entry, field_name)
        if value and value.strip():
            return _date_sort_key(value)
    return (0, 0, 0, 0)


def _get_field(entry: Any, field_name: str) -> str:
    if isinstance(entry, dict):
        value = entry.get(field_name)
    else:
        value = getattr(entry, field_name, None)
    return value or ""


def _is_present_like(value: str) -> bool:
    return value.strip().lower() in {"present", "current", "now"}


def _date_sort_key(value: str) -> tuple[int, int, int, int]:
    text = value.strip()
    if not text:
        return (0, 0, 0, 0)

    if _is_present_like(text):
        return (1, 9999, 12, 31)

    month_year_match = _MONTH_YEAR_PATTERN.match(text)
    if month_year_match:
        month_name = month_year_match.group("month").lower().rstrip(".")
        month = _MONTHS.get(month_name[:3], _MONTHS.get(month_name))
        year = int(month_year_match.group("year"))
        if month:
            return (0, year, month, 1)

    month_slash_year_match = _MONTH_SLASH_YEAR_PATTERN.match(text)
    if month_slash_year_match:
        month = int(month_slash_year_match.group("month"))
        year = int(month_slash_year_match.group("year"))
        if 1 <= month <= 12:
            return (0, year, month, 1)

    year_match = _YEAR_PATTERN.match(text)
    if year_match:
        year = int(year_match.group("year"))
        return (0, year, 12, 31)

    return (0, 0, 0, 0)
