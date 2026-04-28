"""
filing_tracker.py — ComplianceX Filing Request Tracker

In-memory store for Executive → CA filing requests.
Generates realistic acknowledgement numbers per portal type on filing.
No database required — resets on server restart (demo-safe).
"""

from __future__ import annotations
import random
import string
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

filing_requests_store: list[dict] = []


# ---------------------------------------------------------------------------
# ACK number generators
# ---------------------------------------------------------------------------

def _rand_alpha(n: int) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def _generate_ack(form_name: str) -> tuple[str, str]:
    """
    Return (ack_number, portal_name) based on the form type.

    GSTR*  → GST Portal   → AAK{YYMMDD}{6 alphanumeric}
    MGT*/AOC*/DIR* → MCA21 → SRN{8 alphanumeric}
    ITR*/TDS*/26AS → TRACES / IT Portal → ITD{YYMMDD}{5 alphanumeric}
    SEBI / NBS / LODR → SCORES / SEBI → SEB{YYMMDD}{5 alphanumeric}
    Default → Regulatory Portal → REG{YYMMDD}{6 alphanumeric}
    """
    today = datetime.now(timezone.utc).strftime("%y%m%d")
    form_upper = form_name.upper()

    if form_upper.startswith("GSTR") or form_upper.startswith("GST"):
        return f"AAK{today}{_rand_alpha(6)}", "GST Portal"

    if any(form_upper.startswith(p) for p in ("MGT", "AOC", "DIR", "INC", "SH", "CHG")):
        return f"SRN{_rand_alpha(8)}", "MCA21 Portal"

    if any(form_upper.startswith(p) for p in ("ITR", "TDS", "TCS", "26AS", "ITD")):
        return f"ITD{today}{_rand_alpha(5)}", "Income Tax Portal (TRACES)"

    if any(form_upper.startswith(p) for p in ("SEBI", "NBS", "LODR", "RPT")):
        return f"SEB{today}{_rand_alpha(5)}", "SEBI SCORES Portal"

    return f"REG{today}{_rand_alpha(6)}", "Regulatory Portal"


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

def create_filing_request(cin: str, payload: dict) -> dict:
    request = {
        "id":            f"FLR{random.randint(100000, 999999)}",
        "cin":           cin,
        "company_name":  payload["company_name"],
        "form_name":     payload["form_name"],          # e.g. "GSTR-3B", "MGT-7"
        "regulation_ref": payload.get("regulation_ref", ""),  # rule name from news dataset
        "deadline":      payload["deadline"],
        "requested_by":  "Executive",
        "requested_at":  datetime.now(timezone.utc).isoformat(),
        "status":        "PENDING",   # "PENDING" | "IN_PROGRESS" | "FILED"
        "filed_at":      None,
        "filed_by":      None,        # CA name
        "ack_number":    None,
        "ack_portal":    None,
        "notes":         payload.get("notes", None),
    }
    filing_requests_store.append(request)
    return request


def get_filing_requests(cin: str) -> list[dict]:
    """Return all filing requests for a given CIN, newest first."""
    return sorted(
        [f for f in filing_requests_store if f["cin"] == cin],
        key=lambda f: f["requested_at"],
        reverse=True,
    )


def mark_filed(request_id: str, ca_name: str, form_name: str, portal: str) -> dict:
    """
    Mark a filing request as FILED.
    Generates a realistic ACK number based on the form type.
    `portal` param can override the auto-detected portal name.
    """
    for req in filing_requests_store:
        if req["id"] == request_id:
            ack_number, auto_portal = _generate_ack(form_name or req["form_name"])
            req["status"]     = "FILED"
            req["filed_at"]   = datetime.now(timezone.utc).isoformat()
            req["filed_by"]   = ca_name
            req["ack_number"] = ack_number
            req["ack_portal"] = portal or auto_portal
            return req
    raise KeyError(f"Filing request '{request_id}' not found.")


def mark_in_progress(request_id: str) -> dict:
    """Mark a filing request as IN_PROGRESS."""
    for req in filing_requests_store:
        if req["id"] == request_id:
            if req["status"] == "PENDING":
                req["status"] = "IN_PROGRESS"
            return req
    raise KeyError(f"Filing request '{request_id}' not found.")
