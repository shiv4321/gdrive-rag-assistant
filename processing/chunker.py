"""
processing/chunker.py
──────────────────────────────────────────────────────────────────
Splits a document's text into overlapping chunks with metadata.

Strategy: token-aware sliding window
  • Uses tiktoken to count tokens (model-agnostic cl100k_base)
  • Respects sentence boundaries within the token budget
  • Configurable chunk_size and chunk_overlap from settings

Public surface
──────────────
  chunk_document(text, metadata, chunk_size?, chunk_overlap?) → list[Chunk]
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from typing import Any

import tiktoken

from config import get_settings

# Using cl100k_base which works for GPT-4 / embeddings
_ENCODER = tiktoken.get_encoding("cl100k_base")


@dataclass
class Chunk:
    chunk_id: str
    text: str
    token_count: int
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "chunk_id": self.chunk_id,
            "text": self.text,
            "token_count": self.token_count,
            **self.metadata,
        }


def chunk_document(
    text: str,
    metadata: dict[str, Any],
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    """
    Split *text* into token-bounded chunks.

    Parameters
    ----------
    text          : full document text
    metadata      : dict with at least doc_id, file_name, source
    chunk_size    : max tokens per chunk  (default from settings)
    chunk_overlap : overlap tokens        (default from settings)

    Returns
    -------
    Ordered list of Chunk objects ready for embedding.
    """
    settings = get_settings()
    max_tokens = chunk_size or settings.chunk_size
    overlap = chunk_overlap or settings.chunk_overlap

    sentences = _split_sentences(text)
    chunks: list[Chunk] = []
    current_tokens: list[int] = []
    current_sents: list[str] = []
    chunk_index = 0

    for sent in sentences:
        sent_tokens = _ENCODER.encode(sent)

        # If adding this sentence would overflow, flush current buffer
        if current_tokens and len(current_tokens) + len(sent_tokens) > max_tokens:
            chunk_text = " ".join(current_sents).strip()
            if chunk_text:
                chunks.append(
                    _make_chunk(chunk_text, current_tokens, metadata, chunk_index)
                )
                chunk_index += 1

            # Slide the window: keep the last `overlap` tokens worth of sentences
            current_tokens, current_sents = _slide_window(
                current_tokens, current_sents, overlap
            )

        current_tokens.extend(sent_tokens)
        current_sents.append(sent)

    # Flush remainder
    if current_sents:
        chunk_text = " ".join(current_sents).strip()
        if chunk_text:
            chunks.append(_make_chunk(chunk_text, current_tokens, metadata, chunk_index))

    return chunks


def _split_sentences(text: str) -> list[str]:
    """Rough sentence splitter; good enough for RAG chunking."""
    parts = re.split(r"(?<=[.!?])\s+", text)
    result: list[str] = []
    for part in parts:
        sub = re.split(r"\n\n+", part)
        result.extend(s.strip() for s in sub if s.strip())
    return result


def _make_chunk(
    text: str,
    tokens: list[int],
    metadata: dict[str, Any],
    index: int,
) -> Chunk:
    chunk_id = f"{metadata.get('doc_id', 'unknown')}__chunk_{index}"
    return Chunk(
        chunk_id=chunk_id,
        text=text,
        token_count=len(tokens),
        metadata={**metadata, "chunk_index": index},
    )


def _slide_window(
    tokens: list[int],
    sentences: list[str],
    overlap: int,
) -> tuple[list[int], list[str]]:
    """Keep the tail sentences whose total tokens ≤ overlap."""
    kept_sents: list[str] = []
    kept_tokens: list[int] = []

    for sent in reversed(sentences):
        enc = _ENCODER.encode(sent)
        if len(kept_tokens) + len(enc) > overlap:
            break
        kept_sents.insert(0, sent)
        kept_tokens = enc + kept_tokens

    return kept_tokens, kept_sents
