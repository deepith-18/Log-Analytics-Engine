# =============================================================================
# utils/helpers.py
# Miscellaneous utility functions used across the engine.
# =============================================================================

import os
from datetime import datetime
from config.settings import TIMESTAMP_FORMAT, REPORTS_DIR, REPORT_FILENAME_PREFIX


def parse_timestamp(raw: str) -> datetime | None:
    """
    Convert an Apache/Nginx log timestamp string to a Python datetime object.

    Apache format example: "10/Oct/2024:13:55:36 -0700"
    The %z directive handles the UTC-offset (+0000, -0700, etc.).

    Args:
        raw: Raw timestamp string extracted from the log line.

    Returns:
        datetime object (timezone-aware) or None if parsing fails.
    """
    try:
        return datetime.strptime(raw.strip(), TIMESTAMP_FORMAT)
    except ValueError:
        return None


def ensure_dir(path: str) -> None:
    """
    Create a directory (and all parents) if it doesn't already exist.
    Equivalent to `mkdir -p` on Unix.

    Args:
        path: Directory path to create.
    """
    os.makedirs(path, exist_ok=True)


def generate_report_path() -> str:
    """
    Build a timestamped file path for the analytics report.

    Format: data/reports/analytics_report_YYYYMMDD_HHMMSS.txt

    Returns:
        Absolute path string for the new report file.
    """
    ensure_dir(REPORTS_DIR)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"{REPORT_FILENAME_PREFIX}_{timestamp}.txt"
    return os.path.join(REPORTS_DIR, filename)


def format_table(headers: list[str], rows: list[tuple], col_width: int = 25) -> str:
    """
    Render a simple ASCII table for the CLI/report output.

    Args:
        headers  : Column header labels.
        rows     : List of tuples, one per data row.
        col_width: Fixed width for each column.

    Returns:
        Multi-line string representing the table.
    """
    sep  = "+" + "+".join(["-" * col_width] * len(headers)) + "+"
    head = "|" + "|".join(str(h).center(col_width) for h in headers) + "|"

    lines = [sep, head, sep]
    for row in rows:
        line = "|" + "|".join(str(c).ljust(col_width - 1) for c in row) + "|"
        lines.append(line)
    lines.append(sep)
    return "\n".join(lines)


def percentage(part: int | float, total: int | float) -> float:
    """Safe percentage calculation that avoids ZeroDivisionError."""
    return round((part / total) * 100, 2) if total else 0.0