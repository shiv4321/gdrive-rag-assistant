from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from pinecone import Pinecone

from config import get_settings
from embedding.embedder import EmbeddedChunk

logger = logging.getLogger(__name__)

_UPSERT_BATCH = 100  # Pinecone recommends ≤ 100 vectors per upsert


@dataclass
class SearchResult:
    chunk_id: str
    score: float
    text: str
    metadata: dict[str, Any]

    @property
    def file_name(self) -> str:
        return self.metadata.get("file_name", "unknown")

    @property
    def doc_id(self) -> str:
        return self.metadata.get("doc_id", "")


class VectorStore:
    def __init__(self) -> None:
        settings = get_settings()
        self._pc = Pinecone(api_key=settings.pinecone_api_key)
        self._index = self._pc.Index(
            name=settings.pinecone_index_name,
            host=settings.pinecone_host,
        )
        self._top_k = settings.top_k_results

    def upsert(self, embedded_chunks: list[EmbeddedChunk]) -> int:
        if not embedded_chunks:
            return 0

        vectors = []
        for ec in embedded_chunks:
            # Pinecone metadata values must be str / int / float / bool / list[str]
            meta = {k: str(v) if not isinstance(v, (str, int, float, bool, list)) else v
                    for k, v in ec.metadata.items()}
            meta["chunk_text"] = ec.text
            vectors.append({"id": ec.chunk_id, "values": ec.embedding, "metadata": meta})

        upserted = 0
        for i in range(0, len(vectors), _UPSERT_BATCH):
            batch = vectors[i : i + _UPSERT_BATCH]
            self._index.upsert(vectors=batch)
            upserted += len(batch)
            logger.debug("Upserted %d vectors (batch %d)", len(batch), i // _UPSERT_BATCH)

        logger.info("Total vectors upserted: %d", upserted)
        return upserted

    def query(
        self,
        query_vector: list[float],
        top_k: int | None = None,
        filter: dict | None = None,
    ) -> list[SearchResult]:
        k = top_k or self._top_k
        kwargs: dict[str, Any] = dict(vector=query_vector, top_k=k, include_metadata=True)
        if filter:
            kwargs["filter"] = filter

        resp = self._index.query(**kwargs)
        results: list[SearchResult] = []
        for match in resp.get("matches", []):
            meta = match.get("metadata", {})
            text = meta.pop("chunk_text", "")
            results.append(SearchResult(
                chunk_id=match["id"],
                score=match["score"],
                text=text,
                metadata=meta,
            ))
        return results

    def delete_by_doc(self, doc_id: str) -> None:
        self._index.delete(filter={"doc_id": {"$eq": doc_id}})
        logger.info("Deleted vectors for doc_id=%s", doc_id)

    def index_stats(self) -> dict:
        return self._index.describe_index_stats().to_dict()
