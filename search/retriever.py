"""
search/retriever.py
──────────────────────────────────────────────────────────────────
High-level retrieval: embed query → search index → return chunks.

Public surface
──────────────
  Retriever.retrieve(query, top_k, filter) → list[SearchResult]
"""

from __future__ import annotations

import logging
from typing import Any

from embedding.embedder import Embedder
from search.vector_store import SearchResult, VectorStore

logger = logging.getLogger(__name__)


class Retriever:
    def __init__(self) -> None:
        self._embedder = Embedder()
        self._store = VectorStore()

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        filter: dict | None = None,
    ) -> list[SearchResult]:
        """
        End-to-end retrieval: embed *query* then search the vector index.

        Parameters
        ----------
        query  : natural-language question
        top_k  : number of results (defaults to settings.top_k_results)
        filter : optional Pinecone metadata filter, e.g. {"doc_id": {"$eq": "xyz"}}
        """
        logger.info("Retrieving for query: %s", query[:80])
        query_vec = self._embedder.embed_query(query)
        results = self._store.query(query_vec, top_k=top_k, filter=filter)
        logger.info("Retrieved %d chunks", len(results))
        return results
