"""
tax_expert.py — ComplianceX Tax Expert (Doctor 3)

Computes a full tax analysis for a given company using data from
the companies.json dataset. All figures are derived from financials
and compliance_history since the dataset does not store net_profit
or employee_count directly.

Derivation assumptions:
  net_profit       = annual_turnover * 0.12   (12% PAT margin — conservative)
  employee_count   = derived from sector + turnover band
  office_rent      = annual_turnover * 0.02   (2% of turnover for non-owned premises)
  professional_fees = annual_turnover * 0.05  (5% for outsourced professional work)
  contractor_spend  = annual_turnover * 0.08  (8% for contractors)
"""

from __future__ import annotations
from datetime import date, datetime, timedelta
from typing import Optional

# ---------------------------------------------------------------------------
# Current date anchor
# ---------------------------------------------------------------------------

TODAY = date.today()
CURRENT_YEAR = TODAY.year

# Advance tax installment schedule with live due dates
INSTALLMENTS = [
    {"due_str": f"15 Jun {CURRENT_YEAR}",      "due_date": date(CURRENT_YEAR, 6, 15),      "percent": 15,  "label": "1st Installment"},
    {"due_str": f"15 Sep {CURRENT_YEAR}",      "due_date": date(CURRENT_YEAR, 9, 15),      "percent": 45,  "label": "2nd Installment"},
    {"due_str": f"15 Dec {CURRENT_YEAR}",      "due_date": date(CURRENT_YEAR, 12, 15),     "percent": 75,  "label": "3rd Installment"},
    {"due_str": f"15 Mar {CURRENT_YEAR + 1}",  "due_date": date(CURRENT_YEAR + 1, 3, 15),  "percent": 100, "label": "4th Installment"},
]

TDS_FORM_MAP = {
    "Salary":            "24Q",
    "Professional Fees": "26Q",
    "Rent":              "26Q",
    "Contractor":        "26Q",
}

# Sector → typical employee count multiplier (employees per ₹1Cr turnover)
_SECTOR_EMP_PER_CR = {
    "IT Services":                    8,
    "Legal & Professional Services":  10,
    "Healthcare & MedTech":           6,
    "Education Technology":           5,
    "Financial Services & NBFC":      3,
    "Retail & E-Commerce":            4,
    "Manufacturing":                  5,
    "Logistics & Supply Chain":       4,
    "Agribusiness & Food Processing": 3,
    "Real Estate & Construction":     3,
    "Renewable Energy":               2,
    "Shipping & Maritime":            2,
}

# Sectors eligible for specific savings schemes
_SECTOR_SAVINGS = {
    "Manufacturing":                  ["80IC", "35AD"],
    "Renewable Energy":               ["80IC", "35AD", "10AA"],
    "IT Services":                    ["10AA"],
    "Education Technology":           ["10AA"],
    "Agribusiness & Food Processing": ["80IC"],
    "Healthcare & MedTech":           ["35AD"],
    "Real Estate & Construction":     ["35AD"],
    "Logistics & Supply Chain":       ["35AD"],
}

_SAVINGS_META = {
    "80IC": {
        "description": "100% deduction on profits for manufacturing units in special category states (Himachal Pradesh, Uttarakhand, NE states) — Sections 80-IC",
        "rate": 0.30,
    },
    "10AA": {
        "description": "100% deduction on profits of newly established units in SEZs for first 5 years — Section 10AA",
        "rate": 0.25,
    },
    "35AD": {
        "description": "100% deduction on capital expenditure for specified businesses (cold chain, warehousing, hospitals) — Section 35AD",
        "rate": 0.20,
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _derive_net_profit(company: dict) -> int:
    turnover = company.get("financials", {}).get("annual_turnover_inr", 0)
    return int(turnover * 0.12)


def _derive_employee_count(company: dict) -> int:
    turnover_cr = company.get("financials", {}).get("annual_turnover_inr", 0) / 1_00_00_000
    sector = company.get("sector", "")
    per_cr = _SECTOR_EMP_PER_CR.get(sector, 4)
    return max(1, int(turnover_cr * per_cr))


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d %b %Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Main analysis function — fully dynamic
# ---------------------------------------------------------------------------

def compute_tax_analysis(company: dict) -> dict:
    """
    Compute a full tax analysis for a company from the dataset.
    Installment and TDS statuses are computed against today's actual date
    and cross-referenced against the company's filing_history if available.
    """
    fin       = company.get("financials", {})
    ch        = company.get("compliance_history", {})
    fh        = company.get("filing_history", {})
    sector    = company.get("sector", "General")
    city      = company.get("city", "")

    turnover   = fin.get("annual_turnover_inr", 0)
    tax_paid   = fin.get("tax_paid_inr", 0)
    net_profit = _derive_net_profit(company)
    emp_count  = _derive_employee_count(company)

    overdue    = ch.get("overdue_filings", 0)
    risk_flags: list[str] = []

    # ── 1. Corporate tax rate ────────────────────────────────────────────────
    TAX_RATE = 0.25 if turnover < 4_00_00_00_000 else 0.30
    annual_liability = int(net_profit * TAX_RATE)

    # ── 2. Dynamic Advance Tax Installments ─────────────────────────────────
    installments: list[dict] = []
    advance_tax_history = fh.get("advance_tax_payments", [])

    for inst in INSTALLMENTS:
        amount         = int(annual_liability * inst["percent"] / 100)
        days_remaining = (inst["due_date"] - TODAY).days

        # Cross-reference filing_history for a payment near this due date
        paid          = False
        payment_date  = None
        for payment in advance_tax_history:
            try:
                pd = datetime.strptime(payment["date"], "%Y-%m-%d").date()
                if abs((pd - inst["due_date"]).days) <= 30:
                    paid = True
                    payment_date = payment["date"]
                    break
            except Exception:
                pass

        if paid:
            status        = "PAID"
            days_remaining = None
            warning       = None
        elif days_remaining < 0:
            status        = "MISSED"
            days_overdue  = abs(days_remaining)
            interest      = int(amount * 0.015 * max(1, days_overdue // 30))
            warning       = f"Overdue by {days_overdue} days — interest accruing: ₹{interest:,}"
        elif days_remaining <= 7:
            status  = "DUE_SOON"
            warning = f"Due in {days_remaining} days — pay immediately"
        elif days_remaining <= 30:
            status  = "UPCOMING_SOON"
            warning = f"Due in {days_remaining} days"
        else:
            status  = "UPCOMING"
            warning = f"Due in {days_remaining} days"

        installments.append({
            "due":           inst["due_str"],
            "due_date":      inst["due_date"].isoformat(),
            "percent":       inst["percent"],
            "label":         inst["label"],
            "amount":        amount,
            "status":        status,
            "days_remaining": days_remaining,
            "payment_date":  payment_date,
            "warning":       warning,
        })

    # Shortfall and interest from missed installments
    missed_insts = [i for i in installments if i["status"] == "MISSED"]
    shortfall    = sum(i["amount"] for i in missed_insts)
    if missed_insts:
        months_overdue_avg = (
            sum(abs((TODAY - date.fromisoformat(i["due_date"])).days) // 30 for i in missed_insts)
            / len(missed_insts)
        )
    else:
        months_overdue_avg = 0
    interest_liability = int(shortfall * 0.015 * max(1, months_overdue_avg)) if shortfall else 0

    if shortfall > 0:
        risk_flags.append(
            f"Advance tax shortfall of ₹{shortfall / 1_00_000:.1f}L — "
            f"interest liability ₹{interest_liability / 1_00_000:.1f}L"
        )

    # ── 3. Dynamic TDS Obligations ───────────────────────────────────────────
    salary_base       = int(turnover * 0.15)
    professional_fees = int(turnover * 0.05)
    rent_base         = int(turnover * 0.02)
    contractor_spend  = int(turnover * 0.08)

    tds_obligations: list[dict] = []

    def _tds_entry(ttype: str, section: str, base: int, rate: float) -> dict:
        return {
            "type":             ttype,
            "section":         section,
            "estimated_annual": base,
            "tds_rate":        rate,
            "tds_due":         int(base * rate),
        }

    raw_tds: list[dict] = []

    if emp_count > 0:
        raw_tds.append(_tds_entry("Salary", "192", salary_base,
                                  0.20 if emp_count > 12 else 0.10))

    if professional_fees > 50_000:
        raw_tds.append(_tds_entry("Professional Fees", "194J", professional_fees, 0.10))

    pays_rent = sector not in ("Manufacturing", "Agribusiness & Food Processing") or turnover > 5_00_00_000
    if pays_rent and rent_base > 0:
        raw_tds.append(_tds_entry("Rent", "194I", rent_base, 0.10))

    if contractor_spend > 0:
        raw_tds.append(_tds_entry("Contractor", "194C", contractor_spend, 0.02))

    tds_returns_history = fh.get("tds_returns", [])

    for obligation in raw_tds:
        form = TDS_FORM_MAP.get(obligation["type"], "26Q")

        # Find most-recent filing of this form
        last_filed: Optional[date] = None
        for entry in tds_returns_history:
            if entry.get("form") == form:
                fd = _parse_date(entry.get("date"))
                if fd and (last_filed is None or fd > last_filed):
                    last_filed = fd

        days_since = (TODAY - last_filed).days if last_filed else 999

        if last_filed is None:
            obligation.update({
                "status":          "DEFAULTING",
                "status_reason":   f"No {form} filing found on record",
                "days_since_filing": None,
                "interest_accrued": int(obligation["tds_due"] * 0.015),
            })
        elif days_since > 90:
            obligation.update({
                "status":          "DEFAULTING",
                "status_reason":   f"Last {form} filed {days_since} days ago — quarterly filing overdue",
                "days_since_filing": days_since,
                "interest_accrued": int(obligation["tds_due"] * 0.015 * (days_since // 30)),
            })
            risk_flags.append(
                f"TDS default ({obligation['type']}, Section {obligation['section']}) — "
                f"last {form} filed {days_since} days ago"
            )
        elif days_since > 60:
            obligation.update({
                "status":          "AT_RISK",
                "status_reason":   f"Last {form} filed {days_since} days ago — filing due soon",
                "days_since_filing": days_since,
                "interest_accrued": 0,
            })
            risk_flags.append(
                f"TDS at risk ({obligation['type']}, Section {obligation['section']}) — "
                f"quarterly return due soon"
            )
        else:
            obligation.update({
                "status":          "COMPLIANT",
                "status_reason":   f"Last {form} filed {days_since} days ago",
                "days_since_filing": days_since,
                "interest_accrued": 0,
            })

        obligation["last_filed_date"] = last_filed.isoformat() if last_filed else None
        obligation["form"] = form
        tds_obligations.append(obligation)

    # ── 4. MAT check (Section 115JB) ────────────────────────────────────────
    book_profit          = int(net_profit * 1.15)
    mat_liability        = int(book_profit * 0.15)
    regular_tax          = annual_liability
    mat_applies          = mat_liability > regular_tax and book_profit > 0
    tax_credit_available = max(0, mat_liability - regular_tax) if mat_applies else 0

    if mat_applies:
        risk_flags.append(
            f"MAT applicable — ₹{mat_liability / 1_00_000:.1f}L MAT vs "
            f"₹{regular_tax / 1_00_000:.1f}L regular tax"
        )

    mat_check = {
        "applicable":           book_profit > 0,
        "book_profit":          book_profit,
        "mat_liability":        mat_liability,
        "regular_tax":          regular_tax,
        "mat_applies":          mat_applies,
        "tax_credit_available": tax_credit_available,
    }

    # ── 5. Savings opportunities ─────────────────────────────────────────────
    applicable_sections = list(_SECTOR_SAVINGS.get(sector, []))
    sez_cities = {"Bengaluru", "Chennai", "Hyderabad", "Pune", "Ahmedabad", "Surat"}
    if city in sez_cities and "10AA" not in applicable_sections:
        applicable_sections.append("10AA")

    savings_opportunities = []
    for sec in ["80IC", "10AA", "35AD"]:
        meta         = _SAVINGS_META[sec]
        is_applicable = sec in applicable_sections
        estimated_saving = int(net_profit * meta["rate"]) if is_applicable else 0
        savings_opportunities.append({
            "section":          sec,
            "description":      meta["description"],
            "estimated_saving": estimated_saving,
            "applicable":       is_applicable,
        })

    # ── 6. Totals ────────────────────────────────────────────────────────────
    actual_tax      = mat_liability if mat_applies else regular_tax
    total_liability = actual_tax + interest_liability
    effective_rate  = round(total_liability / max(net_profit, 1), 4)

    gst_pending = fin.get("gst_pending_months", 0)
    if gst_pending > 3:
        risk_flags.append(f"GST returns pending for {gst_pending} months — late fee exposure")

    if tax_paid < annual_liability * 0.85:
        gap = annual_liability - tax_paid
        risk_flags.append(f"Tax underpayment detected — ₹{gap / 1_00_000:.1f}L gap vs computed liability")

    return {
        "advance_tax": {
            "annual_liability":   annual_liability,
            "installments":       installments,
            "shortfall":          shortfall,
            "interest_liability": interest_liability,
        },
        "tds_obligations":       tds_obligations,
        "mat_check":             mat_check,
        "savings_opportunities": savings_opportunities,
        "total_tax_liability":   total_liability,
        "effective_rate":        effective_rate,
        "risk_flags":            risk_flags,
    }


# ---------------------------------------------------------------------------
# What-If Simulator
# ---------------------------------------------------------------------------

def compute_what_if(company: dict, tax_analysis: dict) -> dict:
    """
    Generate actionable what-if scenarios based on the computed tax analysis.
    Each scenario shows the current situation, the action required, and the
    monetary or risk benefit of taking that action.
    """
    scenarios = []

    # ── Scenario 1: Pay next upcoming advance tax installment ────────────────
    upcoming = [
        i for i in tax_analysis["advance_tax"]["installments"]
        if i["status"] in ("UPCOMING", "UPCOMING_SOON", "DUE_SOON")
    ]
    if upcoming:
        next_inst    = upcoming[0]
        days         = next_inst.get("days_remaining") or 30
        interest_saved = int(next_inst["amount"] * 0.015)
        scenarios.append({
            "id":          "pay_advance_tax",
            "title":       f"Pay ₹{next_inst['amount']:,} advance tax by {next_inst['due']}",
            "action":      "Pay advance tax installment on time",
            "current":     "Interest will accrue at 1.5%/month under Section 234C if missed",
            "if_done":     f"Save ₹{interest_saved:,} in interest charges",
            "saving":      interest_saved,
            "urgency":     "HIGH" if days <= 7 else "MEDIUM",
            "form":        "Challan 280",
            "days_to_act": days,
        })

    # ── Scenario 2: File overdue TDS returns ─────────────────────────────────
    defaulting_tds = [t for t in tax_analysis["tds_obligations"] if t["status"] == "DEFAULTING"]
    if defaulting_tds:
        total_interest = sum(t.get("interest_accrued", 0) for t in defaulting_tds)
        forms          = list({t["form"] for t in defaulting_tds})
        scenarios.append({
            "id":          "file_tds_returns",
            "title":       f"File overdue TDS returns ({', '.join(forms)})",
            "action":      "File pending TDS returns immediately",
            "current":     f"{len(defaulting_tds)} TDS obligation(s) in default — interest compounding daily",
            "if_done":     f"Stop ₹{total_interest:,} in further interest — avoid prosecution under Section 276B",
            "saving":      total_interest,
            "urgency":     "HIGH",
            "form":        ", ".join(forms),
            "days_to_act": 0,
        })

    # ── Scenario 3: Claim applicable savings ─────────────────────────────────
    for saving in tax_analysis["savings_opportunities"]:
        if saving["applicable"] and saving["estimated_saving"] > 0:
            reduced_tax = max(0, tax_analysis["total_tax_liability"] - saving["estimated_saving"])
            itr_deadline = date(TODAY.year, 10, 31)
            days_to_itr  = (itr_deadline - TODAY).days
            scenarios.append({
                "id":          f"claim_{saving['section'].lower()}",
                "title":       f"Claim Section {saving['section']} deduction",
                "action":      saving["description"],
                "current":     f"Currently paying full tax of ₹{tax_analysis['total_tax_liability']:,}",
                "if_done":     f"Tax reduces to ₹{reduced_tax:,} — save ₹{saving['estimated_saving']:,}",
                "saving":      saving["estimated_saving"],
                "urgency":     "MEDIUM",
                "form":        "ITR-6 with applicable schedule",
                "days_to_act": max(0, days_to_itr),
            })

    # ── Scenario 4: Pay missed advance tax ───────────────────────────────────
    missed = [i for i in tax_analysis["advance_tax"]["installments"] if i["status"] == "MISSED"]
    if missed:
        total_missed    = sum(i["amount"] for i in missed)
        total_interest  = tax_analysis["advance_tax"]["interest_liability"]
        scenarios.append({
            "id":          "pay_missed_advance_tax",
            "title":       f"Pay ₹{total_missed:,} in missed advance tax installments",
            "action":      "Pay all missed installments immediately via Challan 280",
            "current":     f"Interest of ₹{total_interest:,} already accrued under Section 234C",
            "if_done":     f"Stop further interest accrual — current exposure: ₹{total_interest + total_missed:,}",
            "saving":      0,
            "urgency":     "HIGH",
            "form":        "Challan 280",
            "days_to_act": 0,
        })

    # Sort: HIGH urgency first, then by saving amount descending
    urgency_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    scenarios.sort(key=lambda x: (urgency_order.get(x["urgency"], 2), -x["saving"]))

    total_potential_saving = sum(s["saving"] for s in scenarios)

    return {
        "scenarios":             scenarios,
        "total_potential_saving": total_potential_saving,
        "total_scenarios":       len(scenarios),
        "highest_urgency":       scenarios[0]["urgency"] if scenarios else "LOW",
    }


# ---------------------------------------------------------------------------
# Apply Saving Opportunity — creates filing request + CA alert + activity log
# ---------------------------------------------------------------------------

def apply_saving_opportunity(
    cin: str,
    company_name: str,
    scenario_id: str,
    scenario_title: str,
    form: str,
    saving: int,
) -> dict:
    """
    When an executive flags a what-if scenario for action:
    1. Creates a filing request for the CA
    2. Creates an alert to the CA
    3. Logs the activity
    """
    from filing_tracker import create_filing_request
    from alerts import create_alert
    from scheduler import log_activity

    deadline_str = (TODAY + timedelta(days=30)).strftime("%Y-%m-%d")

    request = create_filing_request(cin, {
        "company_name":   company_name,
        "form_name":      form,
        "regulation_ref": scenario_title,
        "deadline":       deadline_str,
    })

    create_alert(cin, {
        "company_name":        company_name,
        "regulation_title":    f"Tax Saving Opportunity — {scenario_title}",
        "regulation_category": "Tax",
        "message": (
            f"Executive has flagged a tax saving opportunity of ₹{saving:,}. "
            f"Action required: {scenario_title}. Please file {form} and confirm."
        ),
        "urgency": "HIGH",
    })

    log_activity(
        "💰",
        f"Tax saving of ₹{saving:,} flagged to CA — {scenario_title}",
        company=company_name,
        severity="INFO",
    )

    return {
        "status":             "flagged",
        "filing_request_id":  request["id"],
        "message":            f"Filing request created and CA alerted — potential saving: ₹{saving:,}",
        "scenario_id":        scenario_id,
    }
