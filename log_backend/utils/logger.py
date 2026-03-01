# =============================================================================
# utils/logger.py
# Centralized logging setup for the entire engine.
# Using Python's built-in `logging` module with both file and console handlers
# so developers see output in real-time AND retain a persistent log file.
# =============================================================================

import logging
import os
from logging.handlers import RotatingFileHandler


def get_logger(name: str) -> logging.Logger:
    """
    Factory function that returns a named logger.

    Every module calls `get_logger(__name__)` to get its own logger that
    inherits from the root logger configured here. This gives per-module
    context in log messages (e.g., "core.parser" vs "analytics.engine").

    Args:
        name: typically __name__ of the calling module.

    Returns:
        Configured logging.Logger instance.
    """
    # Import here to avoid circular imports at module load time
    from config.settings import APP_LOG_FILE

    # Ensure the directory for the app log file exists
    log_dir = os.path.dirname(APP_LOG_FILE)
    os.makedirs(log_dir, exist_ok=True)

    # -------------------------------------------------------------------------
    # Root logger – configure only once (idempotent check via handlers list)
    # -------------------------------------------------------------------------
    root = logging.getLogger()
    if not root.handlers:                    # first call → set up handlers
        root.setLevel(logging.DEBUG)         # capture everything at root level

        # Shared formatter: timestamp | level | module:line | message
        fmt = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )

        # --- Console handler (INFO and above) --------------------------------
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(fmt)

        # --- Rotating file handler (DEBUG and above) -------------------------
        # RotatingFileHandler keeps log files from growing unboundedly.
        # maxBytes=5 MB, backupCount=3 → up to 4 files total (engine.log +
        # engine.log.1 / .2 / .3)
        file_handler = RotatingFileHandler(
            APP_LOG_FILE,
            maxBytes=5 * 1024 * 1024,   # 5 MB per file
            backupCount=3,
            encoding="utf-8"
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(fmt)

        root.addHandler(console_handler)
        root.addHandler(file_handler)

    # Return a child logger with the caller's module name
    return logging.getLogger(name)