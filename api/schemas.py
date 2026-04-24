"""
api/schemas.py
──────────────────────────────────────────────────────────────────
All Pydantic request and response models for the public API.
Keeping schemas separate makes them importable by tests and docs.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


# ── /sync-drive ───────────────────────────────────────────────────────────────

class SyncDriveRequest(BaseModel):
    folder_id: str | None = Field(
        default=None,
        description="Optional Drive folder ID to restrict sync scope."
    )
    force_resync: bool = Field(
        default=False,
        description="If true, re-process files even if already indexed."
    )


class SyncedFileInfo(BaseModel):
    doc_id: str
    file_name: str
    chunks_upserted: int
    status: str  # "synced" | "skipped" | "error"
    error: str | None = None


class SyncDriveResponse(BaseModel):
    total_files_found: int
    synced: int
    skipped: int
    errors: int
    files: list[SyncedFileInfo]


# ── /ask ──────────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Natural-language question.")
    top_k: int = Field(default=5, ge=1, le=20)
    filter: dict[str, Any] | None = Field(
        default=None,
        description="Optional Pinecone metadata filter, e.g. {\"file_name\": {\"$eq\": \"policy.pdf\"}}"
    )


class SourceChunk(BaseModel):
    file_name: str
    doc_id: str
    score: float
    excerpt: str  # first 200 chars of chunk text


class AskResponse(BaseModel):
    answer: str
    sources: list[str]          # deduplicated file names
    source_chunks: list[SourceChunk]
    model: str


# ── /health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    pinecone_vectors: int
    version: str = "1.0.0"


# ── /stats ────────────────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    total_vector_count: int
    index_fullness: float
    dimension: int
    namespaces: dict[str, Any]
