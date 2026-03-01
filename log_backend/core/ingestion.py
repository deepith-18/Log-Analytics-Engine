# =============================================================================
# core/ingestion.py
# Orchestrates the Extract → Transform → Load (ETL) pipeline:
#   1. Extract : LogParser reads and parses the raw log file.
#   2. Transform: (minimal here; richer transformations could be added)
#   3. Load    : DatabaseManager bulk-inserts LogEntry objects into SQLite.
#
# The Ingestion class is the glue between parser and database.
# It also records audit metadata (start/end time, rows loaded/skipped).
# =============================================================================

from datetime import datetime, timezone

from core.database import DatabaseManager
from core.models import LogEntry
from core.parser import LogParser
from config.settings import BATCH_INSERT_SIZE
from utils.logger import get_logger

logger = get_logger(__name__)


class IngestionPipeline:
    """
    Drives the end-to-end process of reading a log file and persisting
    all parsed entries to the database.

    Args:
        log_path: Path to the server log file.
        db: An open DatabaseManager instance (already connected).
        clear_before_ingest: If True, wipe existing logs before loading.
                              Useful for re-processing a file from scratch.

    Example:
        with DatabaseManager() as db:
            pipeline = IngestionPipeline("data/logs/access.log", db)
            stats = pipeline.run()
            print(stats)
    """

    def __init__(self, log_path: str, db: DatabaseManager,
                 clear_before_ingest: bool = False):
        self.log_path            = log_path
        self.db                  = db
        self.clear_before_ingest = clear_before_ingest

    def run(self) -> dict:
        """
        Execute the full ETL pipeline and return a summary dict.

        Steps:
            1. Optionally clear existing data.
            2. Initialise the parser.
            3. Stream parsed LogEntry objects from the parser.
            4. Accumulate entries into batches.
            5. Flush each batch to the database via bulk insert.
            6. Record the ingestion run in the audit table.

        Returns:
            dict with keys: rows_loaded, rows_skipped, duration_seconds
        """
        logger.info("=== Ingestion Pipeline Starting ===")
        started_at = datetime.now(tz=timezone.utc)

        if self.clear_before_ingest:
            logger.info("Clearing existing log data (--fresh flag active).")
            self.db.clear_logs()

        # Initialise parser (raises FileNotFoundError if file missing)
        parser = LogParser(self.log_path)

        # Stream entries from the parser, accumulate in a rolling buffer
        buffer: list[LogEntry] = []
        total_loaded  = 0
        total_skipped = 0

        for entry in parser.parse():
            buffer.append(entry)

            # When buffer reaches the batch size, flush to database
            if len(buffer) >= BATCH_INSERT_SIZE:
                self.db.insert_logs(buffer)
                total_loaded += len(buffer)
                buffer.clear()
                logger.debug(f"Flushed batch → cumulative rows: {total_loaded}")

        # Flush remaining entries that didn't fill a full batch
        if buffer:
            self.db.insert_logs(buffer)
            total_loaded += len(buffer)

        # Retrieve skip count from the parser's internal counter
        total_skipped = parser.stats["skipped"]

        finished_at = datetime.now(tz=timezone.utc)
        duration    = (finished_at - started_at).total_seconds()

        # Record audit trail in ingestion_runs table
        self.db.record_ingestion_run(
            file_path    = self.log_path,
            started_at   = started_at.isoformat(),
            finished_at  = finished_at.isoformat(),
            rows_loaded  = total_loaded,
            rows_skipped = total_skipped,
        )

        summary = {
            "rows_loaded":      total_loaded,
            "rows_skipped":     total_skipped,
            "duration_seconds": round(duration, 3),
        }
        logger.info(f"=== Ingestion Complete: {summary} ===")
        return summary