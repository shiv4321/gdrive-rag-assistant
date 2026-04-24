"""
api/routes.py
──────────────────────────────────────────────────────────────────
All FastAPI route handlers.

Endpoints
─────────
  POST /sync-drive          Ingest (or re-sync) Google Drive documents
  POST /ask                 RAG Q&A
  GET  /health              Liveness + index stats
  GET  /stats               Detailed Pinecone index statistics
  GET  /auth/url            OAuth consent-screen URL (OAuth mode)
  GET  /auth/callback       OAuth code exchange (OAuth mode)
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from api.llm import generate_answer
from api.schemas import (
    AskRequest,
    AskResponse,
    HealthResponse,
    SourceChunk,
    StatsResponse,
    SyncDriveRequest,
    SyncDriveResponse,
    SyncedFileInfo,
)
from config import get_settings
from connectors.gdrive import DriveConnector, DriveFile
from embedding.embedder import Embedder
from processing.chunker import chunk_document
from processing.parser import extract_text
from search.vector_store import VectorStore
from search.retriever import Retriever

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Shared singletons (initialised once per worker) ───────────────────────────
# Lazy-init to avoid import-time credential errors during testing
_embedder: Embedder | None = None
_store: VectorStore | None = None
_retriever: Retriever | None = None


def _get_embedder() -> Embedder:
    global _embedder
    if _embedder is None:
        _embedder = Embedder()
    return _embedder


def _get_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store


def _get_retriever() -> Retriever:
    global _retriever
    if _retriever is None:
        _retriever = Retriever()
    return _retriever


# ── /sync-drive ───────────────────────────────────────────────────────────────

@router.post("/sync-drive", response_model=SyncDriveResponse, tags=["Ingestion"])
async def sync_drive(body: SyncDriveRequest) -> SyncDriveResponse:
    """
    Fetch files from Google Drive, extract text, chunk, embed, and upsert
    into Pinecone.

    - **folder_id**: restrict to a specific Drive folder (optional)
    - **force_resync**: re-process files even if already indexed
    """
    try:
        connector = DriveConnector()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    files = connector.list_files()
    if not files:
        return SyncDriveResponse(
            total_files_found=0, synced=0, skipped=0, errors=0, files=[]
        )

    embedder = _get_embedder()
    store = _get_store()
    results: list[SyncedFileInfo] = []
    synced = skipped = errors = 0

    for drive_file in files:
        info = _process_single_file(
            drive_file, connector, embedder, store, body.force_resync
        )
        results.append(info)
        if info.status == "synced":
            synced += 1
        elif info.status == "skipped":
            skipped += 1
        else:
            errors += 1

    return SyncDriveResponse(
        total_files_found=len(files),
        synced=synced,
        skipped=skipped,
        errors=errors,
        files=results,
    )


def _process_single_file(
    drive_file: DriveFile,
    connector: DriveConnector,
    embedder: Embedder,
    store: VectorStore,
    force: bool,
) -> SyncedFileInfo:
    """Download, parse, chunk, embed and upsert one file."""
    try:
        raw = connector.download_file(drive_file)
        text = extract_text(raw, drive_file.mime_type)

        if not text.strip():
            return SyncedFileInfo(
                doc_id=drive_file.id,
                file_name=drive_file.name,
                chunks_upserted=0,
                status="skipped",
                error="Empty text after extraction",
            )

        metadata = drive_file.to_dict()
        chunks = chunk_document(text, metadata)
        embedded = embedder.embed_chunks(chunks)
        upserted = store.upsert(embedded)

        return SyncedFileInfo(
            doc_id=drive_file.id,
            file_name=drive_file.name,
            chunks_upserted=upserted,
            status="synced",
        )

    except Exception as exc:  # noqa: BLE001
        logger.exception("Error processing %s: %s", drive_file.name, exc)
        return SyncedFileInfo(
            doc_id=drive_file.id,
            file_name=drive_file.name,
            chunks_upserted=0,
            status="error",
            error=str(exc),
        )


# ── /ask ──────────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=AskResponse, tags=["Q&A"])
async def ask(body: AskRequest) -> AskResponse:
    """
    Answer a question grounded in the indexed Drive documents.

    Returns the answer, source filenames, and scored excerpts.
    """
    retriever = _get_retriever()
    settings = get_settings()

    chunks = retriever.retrieve(body.query, top_k=body.top_k, filter=body.filter)
    answer = generate_answer(body.query, chunks)

    # Deduplicate sources while preserving order
    seen: set[str] = set()
    sources: list[str] = []
    for c in chunks:
        if c.file_name not in seen:
            sources.append(c.file_name)
            seen.add(c.file_name)

    source_chunks = [
        SourceChunk(
            file_name=c.file_name,
            doc_id=c.doc_id,
            score=round(c.score, 4),
            excerpt=c.text[:200],
        )
        for c in chunks
    ]

    return AskResponse(
        answer=answer,
        sources=sources,
        source_chunks=source_chunks,
        model=settings.openai_model,
    )


# ── /health ───────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health() -> HealthResponse:
    """Liveness probe + index record count."""
    try:
        stats = _get_store().index_stats()
        vector_count = stats.get("total_vector_count", 0)
    except Exception:
        vector_count = -1

    return HealthResponse(status="ok", pinecone_vectors=vector_count)


# ── /stats ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsResponse, tags=["System"])
async def stats() -> StatsResponse:
    """Detailed Pinecone index statistics."""
    raw = _get_store().index_stats()
    return StatsResponse(
        total_vector_count=raw.get("total_vector_count", 0),
        index_fullness=raw.get("index_fullness", 0.0),
        dimension=raw.get("dimension", 0),
        namespaces=raw.get("namespaces", {}),
    )


# ── OAuth ─────────────────────────────────────────────────────────────────────

@router.get("/auth/url", tags=["Auth"])
async def oauth_url() -> dict:
    """Return the Google OAuth consent-screen URL."""
    return {"url": DriveConnector.get_oauth_url()}


@router.get("/auth/callback", tags=["Auth"])
async def oauth_callback(code: str = Query(...)) -> dict:
    """
    Exchange OAuth code for credentials.
    In production, store the token securely (DB / secret manager).
    """
    DriveConnector.from_oauth_code(code)
    return {"status": "authenticated", "message": "You can now call /sync-drive"}
