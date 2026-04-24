"""
api/llm.py
──────────────────────────────────────────────────────────────────
RAG answer generation using OpenAI or groq or whatever you prefer.

Public surface
──────────────
  generate_answer(query, context_chunks) → str
"""

from __future__ import annotations

import logging

from openai import OpenAI

from config import get_settings
from search.vector_store import SearchResult

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a helpful assistant that answers questions based ONLY on the
provided document excerpts. Be concise and factual.

Rules:
- If the answer is not in the context, say "I couldn't find relevant information in the
  indexed documents."
- Cite the source document name when making a factual claim.
- Never make up information."""


def generate_answer(query: str, chunks: list[SearchResult]) -> str:
    """
    Build a RAG prompt from *chunks* and stream the answer from OpenAI.

    Parameters
    ----------
    query  : the user's question
    chunks : top-k retrieved SearchResult objects

    Returns
    -------
    The model's answer as a plain string.
    """
    settings = get_settings()
    client = OpenAI(api_key=settings.openai_api_key)

    if not chunks:
        return "No relevant documents were found for your query. Please sync your Google Drive first."

    context = _build_context(chunks)

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Context from documents:\n\n{context}\n\n"
                f"Question: {query}\n\n"
                "Answer:"
            ),
        },
    ]

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        max_tokens=settings.max_answer_tokens,
        temperature=0.2,  # low temp for factual RAG answers
    )

    answer = response.choices[0].message.content or ""
    logger.info("LLM generated %d chars for query: %s", len(answer), query[:60])
    return answer.strip()


def _build_context(chunks: list[SearchResult]) -> str:
    """Format retrieved chunks into a numbered context block."""
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(
            f"[{i}] Source: {chunk.file_name}\n"
            f"{chunk.text}\n"
        )
    return "\n---\n".join(parts)
