# Highwatch RAG – Google Drive Q&A Engine

> **Your personal ChatGPT over Google Drive.**  
> Ingest PDFs, Docs, and text files → embed with `llama-text-embed-v2` → store in Pinecone → answer questions with OpenAI GPT-4o-mini.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         POST /api/sync-drive                       │
│                                                                    │
│  Google Drive  ──►  Parser  ──►  Chunker  ──►  Embedder  ──►  Pinecone │
│  (PDF/Docs/TXT)    (PyMuPDF)   (tiktoken)   (llama-v2)    (upsert) │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                           POST /api/ask                            │
│                                                                    │
│  User Query  ──►  Embedder  ──►  Pinecone  ──►  GPT-4o-mini  ──►  Answer │
│              (llama-v2)    (top-k search)   (RAG prompt)    + sources │
└────────────────────────────────────────────────────────────────────┘
```

### Folder Structure

```
highwatch-rag/
├── connectors/
│   └── gdrive.py          ← Google Drive OAuth + Service Account
├── processing/
│   ├── parser.py          ← PDF / DOCX / TXT text extraction
│   └── chunker.py         ← Token-aware sliding-window chunker
├── embedding/
│   └── embedder.py        ← Pinecone inference (llama-text-embed-v2)
├── search/
│   ├── vector_store.py    ← Pinecone upsert / query / delete
│   └── retriever.py       ← Embed query → search index
├── api/
│   ├── routes.py          ← FastAPI route handlers
│   ├── schemas.py         ← Pydantic request/response models
│   └── llm.py             ← OpenAI GPT-4o-mini answer generation
├── frontend/              ← React + Vite UI
│   └── src/
│       ├── pages/         ← AskPage, SyncPage, StatusPage
│       ├── components/    ← Layout, Badge, Button, Card
│       ├── hooks/         ← useHealth
│       └── lib/api.js     ← API client
├── main.py                ← FastAPI app factory
├── config.py              ← Pydantic settings
├── vercel.json            ← Vercel deploy config
├── Dockerfile             ← Docker build
└── docker-compose.yml     ← Local dev stack
```

---

## Prerequisites

| Requirement | Where to get |
|---|---|
| Python 3.11+ | python.org |
| Node.js 20+ | nodejs.org |
| Pinecone account | pinecone.io (free tier works) |
| OpenAI API key | platform.openai.com |
| Google Cloud project | console.cloud.google.com |

---

## Quick Start (Local)

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/highwatch-rag.git
cd highwatch-rag
cp .env.example .env
```

Edit `.env`:

```env
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=drive-doc-index
PINECONE_HOST=https://drive-doc-p3ex16d.svc.aped-4627-b74a.pinecone.io
OPENAI_API_KEY=sk-...
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
```

### 2. Backend

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs → http://localhost:8000/api/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI → http://localhost:5173

---

## Google Drive Setup

### Option A – Service Account (recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Create a **Service Account** → download JSON key
3. Enable **Google Drive API** for your project
4. Share the Drive folder (or entire Drive) with the service account email (`xxx@project.iam.gserviceaccount.com`)
5. Set `GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/key.json` in `.env`

### Option B – OAuth 2.0

1. Create an **OAuth 2.0 Client ID** (Web application type)
2. Add `http://localhost:8000/api/auth/callback` to Authorized Redirect URIs
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env`
4. Visit `GET /api/auth/url` → open the URL → authorize → callback stores credentials

---

## Pinecone Index Setup

Your index must be created with:
- **Model**: `llama-text-embed-v2`
- **Dimensions**: `1024`
- **Metric**: `cosine`

The index `drive-doc-index` in `us-east-1` is already configured in your `.env`.

---

## API Reference

### `POST /api/sync-drive`

Ingest Google Drive documents into Pinecone.

```json
{
  "folder_id": "optional-drive-folder-id",
  "force_resync": false
}
```

**Response:**
```json
{
  "total_files_found": 12,
  "synced": 10,
  "skipped": 1,
  "errors": 1,
  "files": [
    { "doc_id": "abc123", "file_name": "policy.pdf", "chunks_upserted": 18, "status": "synced" }
  ]
}
```

---

### `POST /api/ask`

Answer a question from indexed documents.

```json
{
  "query": "What is our refund policy?",
  "top_k": 5,
  "filter": { "file_name": { "$eq": "policy.pdf" } }
}
```

**Response:**
```json
{
  "answer": "According to policy.pdf, refunds must be requested within 30 days...",
  "sources": ["policy.pdf", "onboarding.docx"],
  "source_chunks": [
    { "file_name": "policy.pdf", "doc_id": "abc", "score": 0.912, "excerpt": "Refunds are processed within..." }
  ],
  "model": "gpt-4o-mini"
}
```

---

### `GET /api/health`

```json
{ "status": "ok", "pinecone_vectors": 847, "version": "1.0.0" }
```

### `GET /api/stats`

```json
{ "total_vector_count": 847, "index_fullness": 0.0003, "dimension": 1024, "namespaces": {} }
```

---

## Sample Queries & Outputs

| Query | Expected Behaviour |
|---|---|
| "What are the key trends in AI and Machine Learning?" | Retrieves trend-related chunks → GPT answers with doc citation |
| "Explain the difference between supervised and unsupervised learning" | Pulls ML concept chunks → structured explanation |
| "What are the main challenges and limitations of AI?" | Scans both papers → bulleted list of challenges |
| "How is AI being applied in healthcare and finance?" | Finds application chunks → precise answer with sources |

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Set secrets
vercel env add PINECONE_API_KEY
vercel env add OPENAI_API_KEY
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
vercel env add PINECONE_INDEX_NAME
vercel env add PINECONE_HOST

# Deploy
vercel --prod
```

> **Note**: Vercel's Python runtime supports FastAPI via ASGI. The `vercel.json` routes `/api/*` to `main.py` and everything else to the built React frontend.

---

## Deploy with Docker

```bash
# Build + run
docker compose up --build

# API: http://localhost:8000
# UI:  http://localhost:5173
```

---

## Chunking Strategy

Chunks use a **token-aware sliding window**:
- `chunk_size = 512 tokens` (cl100k_base encoding)
- `chunk_overlap = 64 tokens`
- Sentence-boundary aware (splits on `.!?` and double newlines)
- Each chunk carries full metadata: `doc_id`, `file_name`, `source`, `chunk_index`

This ensures semantic coherence within chunks while maintaining context continuity across chunk boundaries.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI + Uvicorn |
| Parsing | PyMuPDF, python-docx |
| Chunking | tiktoken (cl100k_base) |
| Embedding | Pinecone Inference – llama-text-embed-v2 |
| Vector DB | Pinecone (us-east-1) |
| LLM | OpenAI GPT-4o-mini |
| Frontend | React 18 + Vite |
| Deploy | Vercel / Docker |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PINECONE_API_KEY` | ✅ | Pinecone API key |
| `PINECONE_INDEX_NAME` | ✅ | Index name (default: `drive-doc-index`) |
| `PINECONE_HOST` | ✅ | Index host URL |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅* | Path or inline JSON of service account |
| `GOOGLE_CLIENT_ID` | ✅* | OAuth client ID (*if using OAuth) |
| `GOOGLE_CLIENT_SECRET` | ✅* | OAuth secret (*if using OAuth) |
| `CHUNK_SIZE` | ❌ | Tokens per chunk (default: 512) |
| `CHUNK_OVERLAP` | ❌ | Overlap tokens (default: 64) |
| `TOP_K_RESULTS` | ❌ | Retrieval count (default: 5) |
| `OPENAI_MODEL` | ❌ | LLM model (default: gpt-4o-mini) |

*One of service account OR OAuth credentials required.

---

---

## Sample Documents (Uploaded to Drive)

| Document | Link | Description |
|---|---|---|
| The Evolution of Artificial Intelligence and Machine Learning | [IJRPR45260.pdf](https://ijrpr.com/uploads/V6ISSUE5/IJRPR45260.pdf) | Covers AI/ML trends, challenges, and future prospects including deep learning, NLP, and real-world applications. |
| A Comprehensive Review of Artificial Intelligence and Machine Learning | [ResearchGate](https://www.researchgate.net/publication/384231012_A_Comprehensive_Review_of_Artificial_Intelligence_and_Machine_Learning_Concepts_Trends_and_Applications) | Holistic review of AI/ML concepts, learning paradigms, ethical AI, IoT integration, and future directions. |

---

Built for **Highwatch AI** – Trial Assignment · RAG + Google Drive
