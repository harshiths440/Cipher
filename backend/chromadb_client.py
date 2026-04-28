"""
ComplianceX ChromaDB Client
Manages a persistent local vector store of Indian compliance regulations.
Uses SentenceTransformer (all-MiniLM-L6-v2) for embeddings — downloaded once
and cached by HuggingFace Hub to ~/.cache/huggingface.

Pre-loads 8 real Indian compliance regulation snippets and exposes a semantic
search function used by both the LangGraph pipeline and the REST API.
"""

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

# ---------------------------------------------------------------------------
# Regulation Corpus — 8 real Indian law snippets (exact spec text)
# ---------------------------------------------------------------------------

REGULATIONS = [
    {
        "id": "reg_001",
        "document": (
            "Every company shall file an annual return with the Registrar within sixty days "
            "from the date on which the annual general meeting is held. In case of default, "
            "the company and every officer in default shall be punishable with fine which shall "
            "not be less than fifty thousand rupees but which may extend to five lakh rupees."
        ),
        "metadata": {
            "act": "Companies Act 2013",
            "section": "Section 92(5)",
            "penalty": "₹50,000 to ₹5,00,000",
        },
    },
    {
        "id": "reg_002",
        "document": (
            "A person shall not be eligible for appointment as a director of a company if he "
            "has been convicted by a court of any offence, whether involving moral turpitude "
            "or otherwise, and sentenced in respect thereof to imprisonment for not less than "
            "six months."
        ),
        "metadata": {
            "act": "Companies Act 2013",
            "section": "Section 164(1)",
            "penalty": "Disqualification from directorship",
        },
    },
    {
        "id": "reg_003",
        "document": (
            "If a person who is already disqualified under sub-section (2) is appointed or "
            "continues as a director in contravention of that sub-section, he shall be "
            "punishable with imprisonment for a term which may extend to one year or with fine "
            "which shall not be less than one lakh rupees."
        ),
        "metadata": {
            "act": "Companies Act 2013",
            "section": "Section 167(1)(a)",
            "penalty": "Imprisonment up to 1 year or fine ₹1,00,000+",
        },
    },
    {
        "id": "reg_004",
        "document": (
            "Every registered person shall furnish a return of inward and outward supplies of "
            "goods or services or both, input tax credit availed, tax payable, tax paid and "
            "such other particulars, within such time and in such manner as may be prescribed."
        ),
        "metadata": {
            "act": "CGST Act 2017",
            "section": "Section 39",
            "penalty": "Late fee ₹50/day per return, max ₹5,000",
        },
    },
    {
        "id": "reg_005",
        "document": (
            "If a registered person fails to furnish return by due date, he shall pay a late "
            "fee of one hundred rupees for every day during which such failure continues "
            "subject to a maximum of five thousand rupees."
        ),
        "metadata": {
            "act": "CGST Act 2017",
            "section": "Section 47",
            "penalty": "₹100/day late fee, max ₹5,000 per return",
        },
    },
    {
        "id": "reg_006",
        "document": (
            "Where an assessee who is liable to pay advance tax has failed to pay such tax "
            "or the advance tax paid by such assessee is less than ninety per cent of the "
            "assessed tax, the assessee shall be liable to pay simple interest at the rate "
            "of one per cent for every month or part of a month."
        ),
        "metadata": {
            "act": "Income Tax Act 1961",
            "section": "Section 234B",
            "penalty": "1% interest per month on unpaid advance tax",
        },
    },
    {
        "id": "reg_007",
        "document": (
            "The financial statement, including consolidated financial statement, if any, "
            "shall be filed with the Registrar within thirty days of the date of the annual "
            "general meeting. In case of default, the company shall be liable to a penalty "
            "of ten thousand rupees."
        ),
        "metadata": {
            "act": "Companies Act 2013",
            "section": "Section 137(3)",
            "penalty": "₹10,000 + ₹100/day continuing default",
        },
    },
    {
        "id": "reg_008",
        "document": (
            "Where a company or an officer of a company commits an offence for which a "
            "penalty or punishment is provided and such company or officer has already been "
            "subject to penalty for the same offence, the penalty for the second or subsequent "
            "offence shall be twice the amount of penalty provided for such offence."
        ),
        "metadata": {
            "act": "Companies Act 2013",
            "section": "Section 454B",
            "penalty": "2x penalty for repeat offences",
        },
    },
]

# ---------------------------------------------------------------------------
# ChromaDB Setup — PersistentClient stores embeddings in ./chroma_db
# ---------------------------------------------------------------------------

_client: chromadb.ClientAPI | None = None
_collection = None


def _get_collection():
    """Lazily initialise ChromaDB PersistentClient and return the regulations collection."""
    global _client, _collection

    if _collection is not None:
        return _collection

    # SentenceTransformerEmbeddingFunction downloads the model once and caches it
    # under ~/.cache/huggingface — no ONNX runtime needed.
    ef = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

    # PersistentClient stores vectors on disk at ./chroma_db (relative to CWD)
    _client = chromadb.PersistentClient(path="./chroma_db")
    _collection = _client.get_or_create_collection(
        name="regulations",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

    # Pre-load documents only if the collection is empty (avoids duplicate inserts on restart)
    if _collection.count() == 0:
        _collection.add(
            ids=[r["id"] for r in REGULATIONS],
            documents=[r["document"] for r in REGULATIONS],
            metadatas=[r["metadata"] for r in REGULATIONS],
        )

    return _collection


def search_regulation(query: str, n_results: int = 2) -> list[dict]:
    """
    Perform a semantic search over the regulations collection.

    Args:
        query: Plain-English query e.g. "penalty for late annual return filing"
        n_results: Number of top matching chunks to return (default 2)

    Returns:
        List of dicts with keys: text, act, section, penalty, relevance_score
    """
    collection = _get_collection()

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, len(REGULATIONS)),
    )

    hits = []
    for doc, meta, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append({
            "text": doc,
            "act": meta.get("act", ""),
            "section": meta.get("section", ""),
            "penalty": meta.get("penalty", ""),
            # Keep metadata dict for backward compat with smoke_test display
            "metadata": meta,
            "relevance_score": round(1 - distance, 4),  # cosine distance → similarity
        })

    return hits
