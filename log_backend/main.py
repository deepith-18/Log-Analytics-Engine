#!/usr/bin/env python3
# =============================================================================
# main.py
# CLI Entry Point for the Log Analytics Engine.
#
# Wires together all modules in the correct order:
#   1. Parse CLI arguments.
#   2. Ingest log file → SQLite database.
#   3. Run analytics queries.
#   4. Run anomaly detection.
#   5. Generate and optionally print the report.
#
# Usage:
#   python main.py --log data/logs/access.log
#   python main.py --log data/logs/access.log --fresh --print-report
#   python main.py --log data/logs/access.log --fresh --no-report
# =============================================================================

import argparse
import sys
import os

# ---------------------------------------------------------------------------
# Make sure the project root is on sys.path so all `from x.y import z` work
# regardless of from which directory the script is invoked.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import DB_PATH
from core.database import DatabaseManager
from core.ingestion import IngestionPipeline
from analytics.engine import AnalyticsEngine
from anomaly.detector import AnomalyDetector
from reports.generator import ReportGenerator
from utils.logger import get_logger
from utils.helpers import ensure_dir

logger = get_logger(__name__)


def parse_args() -> argparse.Namespace:
    """
    Define and parse command-line arguments.

    Returns:
        Parsed Namespace object with all CLI flags.
    """
    parser = argparse.ArgumentParser(
        prog="log-analytics-engine",
        description=(
            "Log Analytics Engine — "
            "Parses Apache/Nginx logs, runs analytics & anomaly detection, "
            "and generates a detailed report."
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )

    parser.add_argument(
        "--log",
        type=str,
        default="data/logs/access.log",
        help="Path to the server log file to analyse.\n(default: data/logs/access.log)",
    )
    parser.add_argument(
        "--db",
        type=str,
        default=DB_PATH,
        help=f"Path to the SQLite database file.\n(default: {DB_PATH})",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        default=False,
        help="Clear existing database data before ingesting.\nUseful for re-processing.",
    )
    parser.add_argument(
        "--print-report",
        action="store_true",
        default=False,
        help="Print the full report to stdout in addition to saving it.",
    )
    parser.add_argument(
        "--no-report",
        action="store_true",
        default=False,
        help="Skip report generation (analytics still runs).",
    )
    parser.add_argument(
        "--skip-ingest",
        action="store_true",
        default=False,
        help=(
            "Skip ingestion and run analytics on existing database data.\n"
            "Useful for re-running reports without re-parsing the log file."
        ),
    )

    return parser.parse_args()


def print_banner() -> None:
    """Print a CLI banner for visual clarity."""
    banner = """
╔══════════════════════════════════════════════════════════════════════════════╗
║            LOG ANALYTICS ENGINE  —  Final Year CSE Project                  ║
║            Python 3 | SQLite | Regex | Statistical Anomaly Detection         ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
    print(banner)


def main() -> None:
    """
    Main orchestration function.

    Flow:
        parse_args → print_banner → connect DB → ingest (optional)
        → analytics → anomaly detection → report generation
    """
    args = parse_args()
    print_banner()

    # Ensure required directories exist
    ensure_dir("data/logs")
    ensure_dir("data/reports")
    ensure_dir("logs")   # engine's own log directory

    logger.info("=" * 60)
    logger.info("Log Analytics Engine starting …")
    logger.info(f"  Log file : {args.log}")
    logger.info(f"  Database : {args.db}")
    logger.info(f"  Fresh    : {args.fresh}")
    logger.info("=" * 60)

    ingestion_stats = {"rows_loaded": 0, "rows_skipped": 0, "duration_seconds": 0}

    with DatabaseManager(db_path=args.db) as db:

        # ------------------------------------------------------------------
        # Step 1: Ingestion
        # ------------------------------------------------------------------
        if not args.skip_ingest:
            print(f"\n📥  Ingesting log file: {args.log}")
            print("─" * 60)

            pipeline = IngestionPipeline(
                log_path=args.log,
                db=db,
                clear_before_ingest=args.fresh,
            )
            ingestion_stats = pipeline.run()

            print(f"  ✅ Rows loaded  : {ingestion_stats['rows_loaded']:,}")
            print(f"  ⚠️  Rows skipped : {ingestion_stats['rows_skipped']:,}")
            print(f"  ⏱️  Duration     : {ingestion_stats['duration_seconds']}s")
        else:
            print("\n⏭️  Skipping ingestion — using existing database data.")

        # Check we actually have data to analyse
        total = db.get_total_requests()
        if total == 0:
            print("\n❌ No data in database. Did you forget to run ingestion?")
            logger.error("Analytics aborted: database is empty.")
            sys.exit(1)

        # ------------------------------------------------------------------
        # Step 2: Analytics
        # ------------------------------------------------------------------
        print(f"\n📊  Running analytics on {total:,} log entries …")
        print("─" * 60)

        engine  = AnalyticsEngine(db)
        results = engine.run_all()

        # Print a quick summary to the console
        print(f"  Total Requests      : {results['total_requests']:,}")
        print(f"  Unique IPs tracked  : {len(results['requests_per_ip'])}")
        print(f"  Error Rate (5xx)    : {results['error_rate']['error_rate_pct']}%")

        # ------------------------------------------------------------------
        # Step 3: Anomaly Detection
        # ------------------------------------------------------------------
        print(f"\n🔍  Running anomaly detection …")
        print("─" * 60)

        detector  = AnomalyDetector(db)
        anomalies = detector.detect_all()

        if anomalies:
            print(f"  ⚠️  {len(anomalies)} anomaly(ies) detected:")
            for a in anomalies:
                # Simple severity → emoji mapping for quick visual scanning
                icon_map = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}
                icon = icon_map.get(a.severity, "⚪")
                print(f"    {icon} [{a.severity}] {a.description}")
        else:
            print("  ✅ No anomalies detected — system looks healthy.")

        # ------------------------------------------------------------------
        # Step 4: Report Generation
        # ------------------------------------------------------------------
        if not args.no_report:
            print(f"\n📝  Generating report …")
            print("─" * 60)

            gen  = ReportGenerator(
                analytics_results = results,
                anomalies         = anomalies,
                source_file       = args.log,
                ingestion_stats   = ingestion_stats,
            )

            report_path = gen.generate()
            print(f"  ✅ Report saved to: {report_path}")

            if args.print_report:
                print("\n" + "=" * 80)
                gen.print_to_console()
        else:
            print("\n⏭️  Report generation skipped (--no-report flag).")

    print("\n✅  Log Analytics Engine completed successfully.\n")
    logger.info("Engine run complete.")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        print(f"\n❌ Error: {e}")
        print("   Make sure the log file path is correct.")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user.")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        print(f"\n❌ Unexpected error: {e}")
        print("   Check logs/engine.log for details.")
        sys.exit(1)