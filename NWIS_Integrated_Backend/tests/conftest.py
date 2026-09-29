"""
NWIS - Pytest Fixtures
"""

import io
import pytest
from starlette.testclient import TestClient
import pymupdf

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def make_pdf():
    """Factory fixture to create PDF bytes with arbitrary text per page."""
    def _create(pages_content: list) -> bytes:
        doc = pymupdf.open()
        for text in pages_content:
            page = doc.new_page()
            page.insert_text((50, 72), text)
        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes
    return _create


@pytest.fixture
def sample_drilling_text():
    return (
        "OIL INDIA LIMITED - DAILY DRILLING REPORT\n"
        "Well Name: NHK-421\n"
        "Well ID: OIL-NHK-421\n"
        "Field: Nahorkatiya\n"
        "Block: AA-ONHP-2018/1\n"
        "Location: Upper Assam Basin\n"
        "Formation: Barail Sandstone\n"
        "Date: 2026-03-29\n"
        "Document Type: Daily Drilling Report\n"
        "Total Depth: 3450 m\n"
        "Measured Depth: 3450 m\n"
        "True Vertical Depth: 3120 m\n\n"
        "OPERATIONAL PARAMETERS:\n"
        "ROP: 18.5 m/hr\n"
        "WOB: 15.2 klbs\n"
        "RPM: 110\n"
        "Mud Weight: 11.4 ppg\n"
        "Flow Rate: 620 gpm\n"
        "Pump Pressure: 2850 psi\n"
        "Standpipe Pressure: 2900 psi\n"
        "Torque: 14.5 kft-lbs\n\n"
        "OPERATIONAL EVENTS AND REMARKS:\n"
        "At 3450 m, severe gas kick observed with 15 bbl pit gain. Well shut in on annular BOP.\n"
        "Partial lost circulation encountered in Barail formation with seepage losses of 25 bbl.\n"
        "Experienced tight hole and sloughing shale during trip out at 3100 m."
    )


@pytest.fixture
def valid_drilling_pdf(make_pdf, sample_drilling_text):
    return make_pdf([sample_drilling_text])


@pytest.fixture
def multipage_pdf(make_pdf):
    page1 = (
        "DAILY DRILLING REPORT - PAGE 1\n"
        "Well Name: BOR-08\n"
        "Field: Borholla\n"
        "Current Depth: 2800 m\n"
        "ROP: 12.0 m/hr\n"
        "RPM: 90\n"
    )
    page2 = (
        "DAILY DRILLING REPORT - PAGE 2 - FORMATION EVALUATION\n"
        "Formation: Tipam Sandstone\n"
        "Mud Weight: 10.8 ppg\n"
        "Flow Rate: 550 gpm\n"
        "Pump Pressure: 2600 psi\n"
        "Minor mud losses of 10 bbl observed at 2750 m.\n"
    )
    page3 = (
        "DAILY DRILLING REPORT - PAGE 3 - WELL INTEGRITY & SUMMARY\n"
        "Standpipe Pressure: 2700 psi\n"
        "WOB: 14.0 klbs\n"
        "No stuck pipe observed during reaming.\n"
        "End of report.\n"
    )
    return make_pdf([page1, page2, page3])
