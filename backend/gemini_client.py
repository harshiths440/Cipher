"""
ComplianceX Gemini Client
Generates actionable remediation steps using Google Gemini API.
"""

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv() 

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

SYSTEM_PROMPT = (
    "You are a senior compliance expert specializing in Indian corporate law "
    "(Companies Act 2013, GST Act, Income Tax Act). Given a company's compliance "
    "violations, generate exactly 3 specific, actionable remediation steps. "
    "Be concise. Reference the specific law section for each step. "
    "Format strictly as:\n"
    "1. [Action] — [Law Reference] — [Timeline]\n"
    "2. [Action] — [Law Reference] — [Timeline]\n"
    "3. [Action] — [Law Reference] — [Timeline]"
)

def generate_remediation(
    company_name: str,
    violations: list[dict],
    risk_score: int,
    risk_bucket: str,
) -> str:
    violation_lines = "\n".join(
        f"- {v['rule']} ({v['severity']}): {v['description']}"
        for v in violations
    ) or "- No violations detected."

    prompt = (
        f"Company: {company_name}\n"
        f"Risk Score: {risk_score}/100 ({risk_bucket})\n"
        f"Violations:\n{violation_lines}"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=500,
            )
        )
        return response.text.strip()
    except Exception as e:
        return (
            "1. File all overdue returns immediately — Companies Act 2013 Section 92 — Within 7 days\n"
            "2. Engage a qualified Company Secretary for compliance audit — ICSI Guidelines — Within 14 days\n"
            "3. Clear all pending tax liabilities with interest — Income Tax Act Section 234B — Within 30 days"
        )