# DocuMind — AI Document Intelligence Platform

**Product Name:** DocuMind  
**Category:** Enterprise AI Document Intelligence  
**Stack:** React 18, Tailwind CSS, Lucide Icons, native ES Modules  

---

## 🏛️ Architecture & Folder Structure

```
frontend/
├── index.html                           # Single Page Application entrypoint
├── README.md                            # Frontend architecture documentation
├── css/
│   └── styles.css                       # Design system CSS variables, typography & prose formatting
└── src/
    ├── types/
    │   └── index.ts                     # Strict TypeScript interfaces matching FastAPI Pydantic schemas
    ├── services/
    │   └── api.js                       # Centralized API client with error mapping & request tracing
    ├── utils/
    │   └── html.js                      # React 18 + HTM zero-build template runtime
    ├── components/
    │   ├── ui/
    │   │   ├── Badge.js                 # Refined status pills (default, primary, success, warning, danger, score)
    │   │   ├── Button.js                # Tactile buttons with loading spinners & size variants
    │   │   ├── Input.js                 # Search & text inputs with focus rings & clear buttons
    │   │   ├── Modal.js                 # Accessible dialogs with backdrop blur & Escape key support
    │   │   ├── Toast.js                 # Auto-dismissing notification toasts
    │   │   └── Skeleton.js              # Skeleton loading screens for tables, cards, and answers
    │   ├── Sidebar.js                   # Persistent sidebar navigation with live health indicator
    │   ├── Header.js                    # Top navbar with breadcrumbs, corpus counter & mobile toggle
    │   ├── DocumentUploadModal.js       # Drag & drop upload with file validation & progress feedback
    │   ├── DocumentTable.js             # Searchable, filterable, sortable table with vector purge dialog
    │   ├── DocumentDetailModal.js       # Full metadata inspector (UUID, chunks, pages, SHA-256)
    │   ├── CitationCard.js              # Interactive citation card linking to source chunks
    │   ├── RetrievedContextPanel.js     # Dedicated inspector displaying exact cosine similarity scores
    │   └── MarkdownRenderer.js          # Prose parser with interactive clickable citation badges
    ├── pages/
    │   ├── OverviewPage.js              # Executive dashboard: live KPIs, health, and quick actions
    │   ├── DocumentsPage.js             # Knowledge base manager with upload and metadata tools
    │   ├── AskAIPage.js                 # Central document Q&A workspace with context inspector
    │   └── SettingsPage.js              # System runtime parameters, models, and health checks
    └── app.js                           # Root application orchestrator with URL hash routing
```

---

## 🎨 Visual Direction & Design System

- **Philosophy:** Minimalist, calm, distraction-free, inspired by Linear, Stripe, and Vercel.
- **Palette:** Soft off-white canvas (`#f8fafc`), deep charcoal primary typography (`#0f172a`), subtle slate borders (`#e2e8f0`), restrained indigo/blue accents (`#2563eb`), emerald success (`#10b981`), amber warnings (`#f59e0b`), and muted rose errors (`#ef4444`).
- **Typography:** Inter for clean user interfaces; JetBrains Mono for document IDs, citations, cosine similarity scores, and SHA-256 hashes.
- **Zero-Build Reliability:** Employs standard browser-native ES Modules (`import/export`) and React 18, ensuring instant loads with zero Node.js build dependencies.

---

## 🚀 Running the Application

Start the application with Uvicorn via `uv`:
```bash
uv run uvicorn backend.main:app --reload --port 8000
```
Then visit **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)** in your browser.
Interactive OpenAPI specifications are available at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.
