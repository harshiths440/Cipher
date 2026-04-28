# Cipher — ComplianceX 4.0

> **5 AI Doctors monitoring your company's compliance health.**  
> AI-powered compliance intelligence platform for Indian corporates — built at a 24-hour hackathon.

---

## 🏥 The Problem

India has 1.5M+ registered companies. Every single one needs MCA, SEBI, GST, and Income Tax compliance. Companies pay ₹10,000–25,000/month to CA firms just for compliance monitoring — done manually, via spreadsheets and WhatsApp reminders.

**ComplianceX replaces that with 5 specialist AI agents.**

---

## 🤖 The 5 AI Doctors

| Doctor      | Role              | What it does                                                  |
| ----------- | ----------------- | ------------------------------------------------------------- |
| 📡 Doctor 1 | The News Reader   | Monitors every new regulation from MCA, SEBI, GST, Income Tax |
| ⚖️ Doctor 2 | The Rule Checker  | Checks your company against every active compliance rule      |
| 🧮 Doctor 3 | The Tax Expert    | Calculates tax liability and identifies savings opportunities |
| 📊 Doctor 4 | The Risk Detector | Scores your company 0–100 and explains every risk factor      |
| 🏛️ Doctor 5 | The Secretary     | Manages your compliance calendar and never misses a deadline  |

---

## 🏗️ Architecture

User Input (CIN)
↓
Master Orchestrator (LangGraph State Machine)
↓
┌─────────────────────────────────────────┐
│ Rule Engine → Risk Scorer → ChromaDB │
│ Regulation Search → Gemini Remediation │
└─────────────────────────────────────────┘
↓
ComplianceStatus JSON → React Dashboard

**Tech Stack:**

- **Backend:** Python, FastAPI, LangGraph, ChromaDB, Sentence Transformers
- **AI:** Google Gemini 2.0 Flash (remediation generation)
- **Vector DB:** ChromaDB with all-MiniLM-L6-v2 embeddings
- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Data:** Pre-loaded MCA company dataset with real compliance histories

---

## 🚀 Setup & Running

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GEMINI_API_KEY to .env
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 📡 API Endpoints

| Method | Endpoint                  | Description                     |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/companies`              | List all companies              |
| GET    | `/company/{cin}`          | Get full company details        |
| POST   | `/analyze/{cin}`          | Run full AI compliance analysis |
| GET    | `/search-regulation?q={}` | Semantic regulation search      |
| GET    | `/docs`                   | Interactive API documentation   |

---

## 📊 Risk Scoring Model

Score = Σ(violation severity points)

- overdue filings × 5 (max 20)
- sector risk index × 10
- disqualified directors × 15
- violations last 12m × 3
- chronic delay bonus (8 pts if avg > 60 days)
  Capped at 100.
  Buckets: 0–25 LOW | 26–50 MEDIUM | 51–75 HIGH | 76–100 CRITICAL

---

## 💰 Business Model

| Plan       | Price         | For               |
| ---------- | ------------- | ----------------- |
| Starter    | ₹2,499/month  | 1 company         |
| Growth     | ₹7,999/month  | Up to 5 companies |
| Enterprise | ₹24,999/month | Unlimited         |

**Unit economics:** ~₹700 cost to serve per customer → ~72% gross margin.

---

## 🎯 Why Now

- MCA21 V3 just launched
- SEBI tightened disclosure norms in 2024
- GST return complexity tripled since 2017
- Regulatory surface area is expanding faster than human CS capacity

---

## ⚠️ Disclaimer

ComplianceX is a decision-support tool, not a decision-making tool. All outputs are AI-generated analysis for informational purposes only. All compliance actions must be reviewed and executed by a qualified Company Secretary or Chartered Accountant. _"We're the co-pilot. The licensed CS is always the pilot."_

---

## 👥 Team

1. Harsh Bharati
2. Harshith S Gowda
3. Rohan Sai Jagan
4. Teju S M  
   Built in 24 hours at TECHFUSION 2.0.
