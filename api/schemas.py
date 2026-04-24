from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class SyncDriveRequest(BaseModel):
    folder_id: str | None = Field(default=None)
    force_resync: bool = Field(default=False)


class SyncedFileInfo(BaseModel):
    doc_id: str
    file_name: str
    chunks_upserted: int
    status: str
    error: str | None = None


class SyncDriveResponse(BaseModel):
    total_files_found: int
    synced: int
    skipped: int
    errors: int
    files: list[SyncedFileInfo]


class AskRequest(BaseModel):
    query: str = Field(..., min_length=3)
    top_k: int = Field(default=5, ge=1, le=20)
    filter: dict[str, Any] | None = Field(default=None)


class SourceChunk(BaseModel):
    file_name: str
    doc_id: str
    score: float
    excerpt: str


class AskResponse(BaseModel):
    answer: str
    sources: list[str]
    source_chunks: list[SourceChunk]
    model: str


class HealthResponse(BaseModel):
    status: str
    pinecone_vectors: int
    version: str = "1.0.0"


class StatsResponse(BaseModel):
    total_vector_count: int
    index_fullness: float
    dimension: int
    namespaces: dict[str, Any]
