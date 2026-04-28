# ComplianceX Backend

AI-powered compliance intelligence platform for Indian private limited companies.
Powered by LangGraph, ChromaDB, and Claude AI.

## Setup

```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and add your Anthropic API key:
#   ANTHROPIC_API_KEY=sk-ant-...

# 4. Start the server
uvicorn main:app --reload --port 8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/companies` | List all companies (summary) |
| `GET` | `/company/{cin}` | Full company object |
| `POST` | `/analyze/{cin}` | Run full compliance pipeline |
| `GET` | `/search-regulation?q=` | Semantic regulation search |

Interactive docs available at: **http://localhost:8000/docs**

## Architecture

```
POST /analyze/{cin}
       │
       ▼
  LangGraph Pipeline
  ┌─────────────────────────────────────────────────┐
  │  load_company → run_rule_engine → run_risk_scorer│
  │  → fetch_regulations → generate_remediation      │
  │  → compile_output                                │
  └─────────────────────────────────────────────────┘
       │
       ▼
  ComplianceStatus (risk score, violations, remediation steps)
```

## Running the Smoke Test

```bash
python smoke_test.py
```

> Note: The full pipeline test (step 6) requires `ANTHROPIC_API_KEY` to be set in `.env`.
