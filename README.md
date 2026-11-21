# 🚀 Production RAG Service

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Persistent-orange)](https://www.trychroma.com/)
[![Google Gemini](https://img.shields.io/badge/LLM-Gemini_2.5_Flash-4285F4?logo=google)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-32_Passed-success)](backend/tests/)

> **A production-grade Retrieval-Augmented Generation (RAG) system with measured evaluation, verified citations, grounded answers, input/output guardrails, and a modern React + Tailwind web interface.**  
> *Portfolio Project 01 · Agentic AI · Instructor: Osama Izhar*

---

## 🌟 Key Capabilities

*   📄 **Multi-Format Document Ingestion:** Full text, table, and structure extraction from both **PDF** (`pdfplumber` + `pypdf` fallback) and **DOCX** (`python-docx`).
*   🧩 **Metadata-Aware Chunking:** Chunks retain document ID, filename, page numbers (PDF), and section headers (DOCX) for precise citations.
*   🔒 **Duplicate Detection (SHA-256):** Prevents duplicate content uploads; identical files return HTTP `409 Conflict`.
*   🗑️ **Document Deletion & Vector Purge:** Deleting a document instantly removes all associated vectors from ChromaDB.
*   🔍 **Cosine Similarity Search & Threshold Filtering:** Top-$K$ retrieval with configurable similarity cutoff ($\ge 0.35$).
*   💬 **Grounded Answers & Citation Enforcement:** Powered by **Google Gemini 2.5 Flash**. Every factual claim cites its verified source (`[Source: filename, page X]`).
*   🛡️ **Refusal Without Hallucination:** Politely and clearly refuses to answer when information is absent from the corpus.
*   🛡️ **Multi-Tiered Guardrails:** 
    *   *Input:* Blocks empty prompts, excessively long inputs, and prompt injection attacks.
    *   *Output:* Scans and redacts leaked API keys or system prompt fragments.
    *   *Document (Bonus F):* Treats document content strictly as data, neutralizing embedded prompt injections.
*   🖥️ **Modern Reactive Frontend (Bonus D):** Built with **React 18** and **Tailwind CSS**. Features drag-and-drop upload, document list, chunk similarity progress bars, and citation drawers.
*   📊 **Reproducible Measured Evaluation:** Evaluated across a 30-question golden dataset comparing **Config A vs Config B** with **Hit Rate@K**, **MRR**, and **LLM-as-a-Judge**.

---

## 📐 Architecture Overview

```
User (Browser) ──► React + Tailwind UI (/) ──► FastAPI REST Endpoints (/api)
                                                         │
         ┌───────────────────────────────────────────────┴──────────────────────────────┐
         ▼                                                                              ▼
POST /api/documents                                                              POST /api/ask
  │                                                                                │
  ├─► Validate File & Extension (.pdf, .docx)                                      ├─► Input Guardrail (Length & Injection Check)
  ├─► SHA-256 Fingerprint (409 Conflict if duplicate)                              ├─► Embed Query (gemini-embedding-exp)
  ├─► Text & Table Extraction (pdfplumber / docx)                                  ├─► ChromaDB Cosine Search (Top-K)
  ├─► Recursive Chunking with Metadata                                             ├─► Similarity Threshold Filter (≥ 0.35)
  ├─► Google GenAI Embeddings                                                      ├─► Short-Circuit Refusal if 0 chunks
  ├─► ChromaDB Persistent Vector Storage                                           ├─► Gemini 2.5 Flash Grounded Generation
  └─► Return 201 Created                                                           ├─► Strict Citation Validation & Stripping
                                                                                   ├─► Output Secret Scrubbing (Guardrail)
                                                                                   └─► Return 200 OK with Chunks & Citations
```

---

## 🛠️ Technology Stack & Decisions

| Component | Selected Technology | Purpose & Justification |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI** | Asynchronous, auto-generates OpenAPI interactive docs at `/docs`. |
| **Language & Tooling** | **Python 3.12+ / uv** | Blazing-fast dependency resolution and virtual environment isolation. |
| **Vector Database** | **ChromaDB** | In-process persistent storage with HNSW index and cosine metric. |
| **Primary LLM** | **Gemini 3.5 Flash Lite** | High-fidelity generation with adaptive multi-model fallback. |
| **Evaluation Judge** | **Gemini 3.5 Flash Lite** | Fast, deterministic scoring for LLM-as-a-Judge evaluations. |
| **Embedding Model** | **gemini-embedding-001** | 3072-dimensional embeddings for high semantic separation. |
| **PDF Extraction** | **pdfplumber + pypdf** | Layout-preserving text extraction with table detection. |
| **DOCX Extraction** | **python-docx** | Heading hierarchy and tabular row extraction. |
| **Chunking** | **LangChain Text Splitters** | `RecursiveCharacterTextSplitter` (512 size / 50 overlap). |
| **Frontend UI** | **React 18 + Tailwind CSS** | Clean, modern UI with responsive cards and similarity score bars. |

*For in-depth design justifications and trade-off analysis, see [DESIGN.md](DESIGN.md).*

---

## ⚡ Quickstart & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/MSulaimanAbid/Production-RAG-Service.git
cd Production-RAG-Service
```

### 2. Environment Setup with `uv`
Ensure [`uv`](https://github.com/astral-sh/uv) is installed. Then run:
```bash
# Create virtual environment and sync dependencies
uv sync
```

### 3. Configure API Keys
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and set your Google AI Studio API key:
```env
GOOGLE_API_KEY=your_actual_google_api_key_here
```
*(Get your free API key at [ai.google.dev](https://aistudio.google.com/)).*

---

## 🏃 Running the Application

### Start the FastAPI Backend & Frontend
Run the application server using `uv`:
```bash
uv run uvicorn backend.main:app --reload --port 8000
```

*   **Interactive Web UI:** Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.
*   **Swagger API Docs:** Explore the live interactive API at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
*   **ReDoc Alternative:** Available at [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc).

---

## 🧪 Automated Testing

We maintain a suite of **32 automated tests** covering unit, API, integration, and guardrail layers.

To execute all tests:
```bash
uv run pytest backend/tests -v
```

### Test Coverage Highlights:
- `backend/tests/test_api.py`: Validates all status codes (200, 201, 204, 400, 404, 409, 415, 422).
- `backend/tests/test_ingestion.py`: Tests real PDF and DOCX extraction, cleaning, and ChromaDB CRUD.
- `backend/tests/test_guardrails.py`: Tests prompt injection rejection and API key redaction.
- `backend/tests/test_retrieval.py`: Tests similarity threshold filtering and doc ID scopes.
- `backend/tests/test_generation.py`: Tests grounded answer formatting, citation validation, and refusal.
- `backend/tests/test_evals.py`: Verifies Hit Rate@K, MRR, and refusal accuracy calculations.

---

## 📊 Measured Evaluation Suite

The service includes an evaluation suite that tests 30 golden questions across two system configurations.

### Reproduce Benchmark Results:
```bash
# Evaluate Config A (Recursive 512/50)
uv run python -m backend.evals.eval_runner --config a --save-results

# Evaluate Config B (Fixed 256/32)
uv run python -m backend.evals.eval_runner --config b --save-results
```

### Benchmark Summary:
| Metric | Config A (Winner) | Config B |
| :--- | :---: | :---: |
| **Hit Rate @ 5** | **92.0%** | 84.0% |
| **Mean Reciprocal Rank (MRR)** | **0.8267** | 0.7133 |
| **Unanswerable Refusal Accuracy** | **100.0%** | 100.0% |
| **Citation Precision** | **100.0%** | 100.0% |
| **Answer Faithfulness** | **0.965** | 0.940 |

*For complete evaluation details, golden dataset breakdown, and failure analysis, see [EVAL.md](EVAL.md).*

---

## 📂 Project Structure

```
Production-RAG-Service/
├── backend/
│   ├── config.py             # Centralized settings loaded via pydantic-settings
│   ├── dependencies.py       # Dependency injection factories
│   ├── generation.py         # Grounded Gemini generation & citation validation
│   ├── guardrails.py         # Input validation, output scrub, injection defense
│   ├── main.py               # FastAPI entry point & route definitions
│   ├── retrieval.py          # Vector query & similarity threshold filtering
│   ├── schemas.py            # Pydantic request/response models with examples
│   ├── ingestion/
│   │   ├── chunker.py        # Recursive and fixed chunking with metadata
│   │   ├── cleaner.py        # Unicode & hyphenation normalization
│   │   ├── embedder.py       # Google GenAI async batched embeddings
│   │   ├── extractor.py      # PDF (pdfplumber) & DOCX (python-docx) extraction
│   │   ├── pipeline.py       # Full end-to-end ingestion coordinator
│   │   └── vector_store.py   # ChromaDB persistent collection CRUD
│   ├── evals/
│   │   ├── eval_runner.py    # CLI evaluation benchmark runner
│   │   ├── golden_dataset.json # 30 hand-annotated test questions
│   │   ├── judge.py          # Gemini 2.5 Pro LLM-as-a-Judge
│   │   ├── metrics.py        # Hit Rate@K, Recall, MRR, Refusal Accuracy
│   │   └── results/          # Stored JSON benchmark outputs
│   └── tests/                # 32 pytest unit and integration tests
├── corpus/                   # Benchmark corpus (PDFs and DOCX files)
├── frontend/
│   └── index.html            # Standalone React 18 + Tailwind CSS application
├── notebooks/                # 6 Jupyter experiment notebooks (01 to 06)
├── DESIGN.md                 # Design decisions & trade-off justifications
├── EVAL.md                   # Evaluation results, metric tables & failure analysis
├── requirements.txt          # Pinned Python package dependencies
├── pyproject.toml            # Project configuration and build metadata
└── README.md                 # Project documentation
```

---

## 🛡️ Responsible AI & AI Usage Disclosure

Per course requirements, AI developer assistants were utilized during development:
- **Models Used:** Gemini 3.8 Flash, Claude Sonnet 4.6, Google Gemini 2.5 Flash/Pro.
- **Tools:** VS Code, uv package manager, Git.
- **Human Oversight:** All architecture designs, mathematical formulations for metrics, prompt schemas, and security boundaries were personally verified and tested by the author. Every line of code in this repository is understood and can be defended in the viva/demo.

---

## 📜 License
Academic Portfolio Project · Developed for educational and evaluation purposes.
