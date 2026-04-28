"""
scheduler.py — ComplianceX Automation Engine

Three background jobs run every 60 seconds:
  1. job_deadline_scanner   — detect overdue filings across all companies
  2. job_regulation_detector — match new regulations to affected companies
  3. job_filing_escalator   — escalate stale filing requests

In-memory activity_log (max 50 entries, newest-first) provides a live
audit trail for the /activity-log endpoint.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from alerts import create_alert, alerts_store
from filing_tracker import create_filing_request, filing_requests_store

# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------

activity_log: list[dict] = []   # max 50 entries, newest first

_DATA_PATH = Path(__file__).parent / "data" / "companies.json"


def log_activity(
    icon: str,
    message: str,
    company: str | None = None,
    severity: str = "INFO",
) -> dict:
    """Prepend an entry to activity_log and enforce the 50-entry cap."""
    entry = {
        "id":              f"ACT{random.randint(100000, 999999)}",
        "timestamp":       datetime.now().strftime("%H:%M:%S"),
        "full_timestamp":  datetime.now().isoformat(),
        "icon":            icon,
        "message":         message,
        "company":         company,
        "severity":        severity,   # "INFO" | "WARNING" | "CRITICAL"
    }
    activity_log.insert(0, entry)
    if len(activity_log) > 50:
        activity_log.pop()
    return entry


# ---------------------------------------------------------------------------
# Company loader
# ---------------------------------------------------------------------------

def get_all_companies() -> list[dict]:
    """Load the companies dataset from disk on every call (demo-safe, small file)."""
    with open(_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Job 1 — Deadline Scanner
# ---------------------------------------------------------------------------

OBLIGATIONS = [
    {"form": "GSTR-3B",    "category": "GST",       "frequency": "monthly"},
    {"form": "MGT-7",      "category": "Corporate",  "frequency": "annual"},
    {"form": "AOC-4",      "category": "Corporate",  "frequency": "annual"},
    {"form": "DIR-3 KYC",  "category": "Corporate",  "frequency": "annual"},
    {"form": "ITR-6",      "category": "Tax",        "frequency": "annual"},
    {"form": "TDS Return", "category": "Tax",        "frequency": "quarterly"},
    {"form": "Advance Tax","category": "Tax",        "frequency": "quarterly"},
]

# Map obligation form → company fields that signal whether it is overdue
def _is_form_overdue(company: dict, obligation: dict) -> tuple[bool, int]:
    """
    Return (is_overdue, days_overdue) by inspecting the company record.
    Because companies.json does not carry per-form filing dates we derive
    overdue status from the existing compliance / financials fields.
    """
    form  = obligation["form"]
    freq  = obligation["frequency"]
    ch    = company.get("compliance_history", {})
    fin   = company.get("financials", {})
    gst   = company.get("gst", fin)   # newer records use a nested 'gst' key

    now = datetime.now()

    # ── GSTR-3B ──────────────────────────────────────────────────────────────
    if form == "GSTR-3B":
        pending = gst.get("gst_pending_months") or fin.get("gst_pending_months", 0)
        if pending and pending > 0:
            return True, min(pending * 30, 365)
        gst_filed = gst.get("gst_returns_filed") or fin.get("gst_returns_filed", True)
        if not gst_filed:
            return True, 30
        return False, 0

    # ── Annual Return (MGT-7) / AOC-4 ────────────────────────────────────────
    if form in ("MGT-7", "AOC-4"):
        if not ch.get("annual_returns_filed", True):
            last_raw = ch.get("last_annual_return_date")
            if last_raw:
                try:
                    last_date = datetime.strptime(last_raw, "%Y-%m-%d")
                    days_since = (now - last_date).days
                    if days_since > 365:
                        return True, days_since - 365
                except Exception:
                    pass
            return True, 30
        overdue_count = ch.get("overdue_filings", 0)
        if overdue_count > 0:
            return True, ch.get("filing_delay_days_avg", 30)
        return False, 0

    # ── DIR-3 KYC ────────────────────────────────────────────────────────────
    if form == "DIR-3 KYC":
        # Any disqualified director implies KYC likely lapsed
        directors = company.get("directors", [])
        if any(d.get("disqualified") for d in directors):
            return True, 15
        return False, 0

    # ── ITR-6 ────────────────────────────────────────────────────────────────
    if form == "ITR-6":
        tax_paid   = fin.get("tax_paid_inr", 1)
        tax_liable = fin.get("tax_liability_inr", 0)
        if tax_liable > 0 and tax_paid < tax_liable * 0.9:
            return True, 30
        return False, 0

    # ── TDS Return ────────────────────────────────────────────────────────────
    if form == "TDS Return":
        violations = ch.get("violations_last_12m", 0)
        if violations >= 3:
            return True, 20
        return False, 0

    # ── Advance Tax ───────────────────────────────────────────────────────────
    if form == "Advance Tax":
        tax_liable = fin.get("tax_liability_inr", 0)
        adv_paid   = fin.get("advance_tax_paid_inr", fin.get("tax_paid_inr", tax_liable))
        if tax_liable > 0 and adv_paid < tax_liable * 0.75:
            return True, 25
        return False, 0

    return False, 0


async def job_deadline_scanner() -> None:
    """Scan every company for overdue obligations and auto-create alerts + filing requests."""
    companies = get_all_companies()
    log_activity("🔍", f"Scanning {len(companies)} companies for deadline violations")

    for company in companies:
        cin  = company["cin"]
        name = company["name"]

        for obligation in OBLIGATIONS:
            form = obligation["form"]
            is_overdue, days_overdue = _is_form_overdue(company, obligation)

            if not is_overdue:
                continue

            # ── Auto-alert (skip if un-acknowledged one already exists) ──────
            existing_alert = [
                a for a in alerts_store
                if a["cin"] == cin
                and form in a.get("regulation_title", "")
                and a["status"] != "ACKNOWLEDGED"
            ]
            if not existing_alert:
                urgency = "EMERGENCY" if days_overdue > 7 else "HIGH"
                create_alert(cin, {
                    "company_name":        name,
                    "regulation_title":    f"{form} — Overdue Filing",
                    "regulation_category": obligation["category"],
                    "message": (
                        f"Automated scan detected {form} is overdue by "
                        f"{days_overdue} days. Immediate filing required to "
                        f"avoid penalties."
                    ),
                    "urgency": urgency,
                })
                log_activity(
                    "🚨" if urgency == "EMERGENCY" else "⚠️",
                    f"{form} overdue — auto-alert sent to CA",
                    company=name,
                    severity="CRITICAL" if urgency == "EMERGENCY" else "WARNING",
                )

            # ── Auto-filing request (skip if an open one already exists) ─────
            existing_req = [
                r for r in filing_requests_store
                if r["cin"] == cin
                and r["form_name"] == form
                and r["status"] != "FILED"
            ]
            if not existing_req:
                create_filing_request(cin, {
                    "company_name":   name,
                    "form_name":      form,
                    "regulation_ref": f"Auto-detected overdue {form}",
                    "deadline":       (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
                })
                log_activity(
                    "📋",
                    f"Filing request auto-created: {form}",
                    company=name,
                )


# ---------------------------------------------------------------------------
# Job 2 — Regulation Impact Detector
# ---------------------------------------------------------------------------

# Sector → regulatory categories that affect it
_SECTOR_CATEGORY_MAP: dict[str, list[str]] = {
    "Financial Services & NBFC":      ["Securities", "Tax", "Corporate"],
    "Information Technology":         ["Tax", "Corporate"],
    "IT Services":                    ["Tax", "Corporate"],
    "Manufacturing":                  ["GST", "Corporate", "Tax"],
    "Healthcare & MedTech":           ["GST", "Corporate"],
    "Real Estate & Construction":     ["GST", "Tax", "Corporate"],
    "Shipping & Maritime":            ["GST", "Corporate"],
    "Education Technology":           ["Tax", "Corporate", "GST"],
    "Retail & E-Commerce":            ["GST", "Corporate", "Tax"],
    "Logistics & Supply Chain":       ["GST", "Corporate", "Tax"],
    "Agribusiness & Food Processing": ["GST", "Tax"],
    "Renewable Energy":               ["Tax", "Corporate"],
    "Legal & Professional Services":  ["Tax", "Corporate"],
}


async def job_regulation_detector() -> None:
    """Match recent regulatory news to affected companies and create alerts."""
    from news_fetcher import get_regulatory_news  # local import to avoid circular
    import asyncio

    try:
        news = await get_regulatory_news(max_items=50)
    except Exception:
        return

    companies = get_all_companies()

    # Filter to news from the last 7 days
    recent_news: list[dict] = []
    for item in news:
        try:
            item_date = datetime.strptime(item["date"], "%d %b %Y")
            if (datetime.now() - item_date).days <= 7:
                recent_news.append(item)
        except Exception:
            recent_news.append(item)   # include if date parsing fails

    if not recent_news:
        log_activity("📡", "Regulation detector: no recent news to process")
        return

    for item in recent_news:
        rule_name = item.get("rule_name", item.get("title", "Unknown"))
        for company in companies:
            sector = company.get("sector", "")
            relevant_cats = _SECTOR_CATEGORY_MAP.get(sector, ["Corporate"])

            if item.get("category") not in relevant_cats:
                continue

            # Skip if an alert for this rule + company already exists
            existing = [
                a for a in alerts_store
                if a["cin"] == company["cin"]
                and rule_name in a.get("regulation_title", "")
            ]
            if existing:
                continue

            create_alert(company["cin"], {
                "company_name":        company["name"],
                "regulation_title":    rule_name,
                "regulation_category": item.get("category", "General"),
                "message": (
                    f"New regulation detected: {item.get('what_changed', item.get('title', ''))} "
                    f"Deadline: {item.get('deadline', 'As notified')}. "
                    f"Penalty: {item.get('penalty', 'See regulation text')}."
                ),
                "urgency": "HIGH" if item.get("severity") == "HIGH" else "LOW",
            })
            log_activity(
                "📡",
                f"New regulation '{rule_name}' affects {company['name']}",
                company=company["name"],
                severity="WARNING",
            )


# ---------------------------------------------------------------------------
# Job 3 — Filing Escalator
# ---------------------------------------------------------------------------

async def job_filing_escalator() -> None:
    """Escalate filing requests that have been sitting idle too long."""
    now = datetime.now()

    for request in filing_requests_store:
        if request["status"] == "FILED":
            continue

        try:
            requested_at   = datetime.fromisoformat(request["requested_at"])
            hours_pending  = (now - requested_at).total_seconds() / 3600
            cin            = request["cin"]
            form           = request["form_name"]
            company_name   = request["company_name"]

            if request["status"] == "PENDING" and hours_pending > 48:
                # Escalate to EMERGENCY
                existing = [
                    a for a in alerts_store
                    if a["cin"] == cin
                    and "ESCALATED" in a.get("message", "")
                    and form in a.get("regulation_title", "")
                ]
                if not existing:
                    create_alert(cin, {
                        "company_name":        company_name,
                        "regulation_title":    f"{form} — Filing Request Escalated",
                        "regulation_category": "Corporate",
                        "message": (
                            f"ESCALATED: Filing request for {form} has been PENDING "
                            f"for {int(hours_pending)} hours with no action taken."
                        ),
                        "urgency": "EMERGENCY",
                    })
                    log_activity(
                        "🔴",
                        f"Filing request escalated to EMERGENCY: {form}",
                        company=company_name,
                        severity="CRITICAL",
                    )

            elif request["status"] == "PENDING" and hours_pending > 24:
                existing = [
                    a for a in alerts_store
                    if a["cin"] == cin
                    and "pending for over 24 hours" in a.get("message", "").lower()
                    and form in a.get("regulation_title", "")
                ]
                if not existing:
                    create_alert(cin, {
                        "company_name":        company_name,
                        "regulation_title":    f"{form} — Action Required",
                        "regulation_category": "Corporate",
                        "message": (
                            f"Filing request for {form} has been pending for over "
                            f"24 hours. Please begin filing immediately."
                        ),
                        "urgency": "HIGH",
                    })
                    log_activity(
                        "🟠",
                        f"Filing request unactioned 24 hrs: {form}",
                        company=company_name,
                        severity="WARNING",
                    )

            elif request["status"] == "IN_PROGRESS" and hours_pending > 12:
                log_activity(
                    "⏳",
                    f"Filing in progress >12 hrs: {form}",
                    company=company_name,
                    severity="INFO",
                )

        except Exception:
            continue


# ---------------------------------------------------------------------------
# Scheduler setup
# ---------------------------------------------------------------------------

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    """Register all jobs and start the APScheduler event loop."""
    scheduler.add_job(
        job_deadline_scanner,
        "interval",
        seconds=60,
        id="deadline_scanner",
        replace_existing=True,
    )
    scheduler.add_job(
        job_regulation_detector,
        "interval",
        seconds=60,
        id="regulation_detector",
        replace_existing=True,
    )
    scheduler.add_job(
        job_filing_escalator,
        "interval",
        seconds=60,
        id="filing_escalator",
        replace_existing=True,
    )
    scheduler.start()
    log_activity(
        "✅",
        "ComplianceX automation engine started — scanning every 60 seconds",
        severity="INFO",
    )
