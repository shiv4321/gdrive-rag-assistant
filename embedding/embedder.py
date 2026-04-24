from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from pinecone import Pinecone

from config import get_settings
from processing.chunker import Chunk

logger = logging.getLogger(__name__)

_BATCH_SIZE = 96  # Pinecone inference max per request


@dataclass
class EmbeddedChunk:
    chunk_id: str
    text: str
    embedding: list[float]
    metadata: dict[str, Any]


class Embedder:
    def __init__(self) -> None:
        settings = get_settings()
        self._pc = Pinecone(api_key=settings.pinecone_api_key)
        self._model = settings.embedding_model

    def embed_chunks(self, chunks: list[Chunk]) -> list[EmbeddedChunk]:
        if not chunks:
            return []

        results: list[EmbeddedChunk] = []

        for batch_start in range(0, len(chunks), _BATCH_SIZE):
            batch = chunks[batch_start : batch_start + _BATCH_SIZE]
            texts = [c.text for c in batch]
            vectors = self._embed_texts(texts, input_type="passage")

            for chunk, vec in zip(batch, vectors):
                results.append(
                    EmbeddedChunk(
                        chunk_id=chunk.chunk_id,
                        text=chunk.text,
                        embedding=vec,
                        metadata=chunk.metadata,
                    )
                )

            logger.debug(
                "Embedded batch %d-%d (%d chunks)",
                batch_start,
                batch_start + len(batch),
                len(batch),
            )

        logger.info("Embedded %d chunks total", len(results))
        return results

    def embed_query(self, text: str) -> list[float]:
        vecs = self._embed_texts([text], input_type="query")
        return vecs[0]

    def _embed_texts(self, texts: list[str], input_type: str) -> list[list[float]]:
        response = self._pc.inference.embed(
            model=self._model,
            inputs=texts,
            parameters={"input_type": input_type, "truncate": "END"},
        )
        return [item["values"] for item in response]
