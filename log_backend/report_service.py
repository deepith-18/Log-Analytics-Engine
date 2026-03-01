from reports.generator import ReportGenerator
from pathlib import Path


def generate_report():
    generator = ReportGenerator()
    report_path = generator.generate()
    return report_path