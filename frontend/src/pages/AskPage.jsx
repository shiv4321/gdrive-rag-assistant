import React, { useState, useRef, useEffect } from "react";
import { Send, FileText, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { ask } from "../lib/api";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";

const EXAMPLE_QUERIES = [
  "What is the refund policy?",
  "Summarize the onboarding process",
  "What are the compliance requirements?",
  "List all key deadlines mentioned",
];

export default function AskPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [topK, setTopK] = useState(5);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(query) {
    const q = (query || input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", text: q, id: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await ask(q, topK);
      setMessages((m) => [...m, {
        role: "assistant",
        text: res.answer,
        sources: res.sources,
        sourceChunks: res.source_chunks,
        model: res.model,
        id: Date.now() + 1,
      }]);
    } catch (e) {
      setMessages((m) => [...m, {
        role: "error",
        text: e.message,
        id: Date.now() + 1,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "18px 28px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>
            Ask Anything
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Questions answered from your indexed Google Drive docs
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Top-K</label>
          <select
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "var(--radius)",
              padding: "5px 10px",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            {[3, 5, 8, 10].map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        {messages.length === 0 && (
          <EmptyState onExample={(q) => submit(q)} />
        )}
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 28px",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          gap: 10,
          background: "var(--bg-3)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "10px 14px",
          transition: "border-color var(--transition)",
        }}
          onFocus={(e) => e.currentTarget.style.borderColor = "var(--border-accent)"}
          onBlur={(e) => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder="Ask a question about your documents…"
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontSize: 14,
              resize: "none",
              lineHeight: 1.5,
              maxHeight: 120,
              overflow: "auto",
            }}
          />
          <Button onClick={() => submit()} disabled={!input.trim() || loading} size="sm">
            <Send size={14} />
          </Button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
          ↵ Enter to send · Shift+↵ for newline
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onExample }) {
  return (
    <div style={{ maxWidth: 560, margin: "60px auto 0", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div style={{
        width: 56, height: 56,
        background: "var(--accent-dim)",
        border: "1px solid var(--border-accent)",
        borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <Sparkles size={24} color="var(--accent)" />
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Start with a question
      </h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 28 }}>
        Ask anything about your synced Drive documents — policies, SOPs, contracts, guides.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => onExample(q)}
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              borderRadius: "var(--radius)",
              padding: "7px 14px",
              fontSize: 13,
              cursor: "pointer",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-2)";
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ msg }) {
  const [expanded, setExpanded] = useState(false);
  const isUser = msg.role === "user";
  const isError = msg.role === "error";

  return (
    <div
      style={{
        marginBottom: 20,
        animation: "fadeUp 0.25s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        maxWidth: "100%",
      }}
    >
      {/* Role label */}
      <div style={{
        fontSize: 11,
        color: "var(--text-3)",
        fontFamily: "var(--font-mono)",
        marginBottom: 5,
        paddingLeft: 2,
      }}>
        {isUser ? "YOU" : isError ? "ERROR" : "HIGHWATCH AI"}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "78%",
        background: isUser
          ? "var(--accent-dim)"
          : isError
          ? "rgba(255,68,102,0.08)"
          : "var(--bg-3)",
        border: `1px solid ${isUser
          ? "var(--border-accent)"
          : isError
          ? "rgba(255,68,102,0.25)"
          : "var(--border)"}`,
        borderRadius: isUser
          ? "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)"
          : "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
        padding: "13px 16px",
        fontSize: 14,
        lineHeight: 1.7,
        color: isUser ? "var(--accent)" : isError ? "var(--red)" : "var(--text)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {msg.text}
      </div>

      {/* Sources */}
      {msg.sources && msg.sources.length > 0 && (
        <div style={{ maxWidth: "78%", marginTop: 8 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "var(--text-3)",
              fontSize: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "3px 0",
              fontFamily: "var(--font-mono)",
            }}
          >
            <FileText size={12} />
            {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""}
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {expanded && (
            <div style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              animation: "fadeUp 0.2s ease",
            }}>
              {msg.sourceChunks?.map((chunk, i) => (
                <div key={i} style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "10px 14px",
                  fontSize: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-2)", fontSize: 11 }}>
                      {chunk.file_name}
                    </span>
                    <Badge variant="blue">
                      score: {chunk.score}
                    </Badge>
                  </div>
                  <p style={{ color: "var(--text-2)", lineHeight: 1.5, fontStyle: "italic" }}>
                    "{chunk.excerpt}…"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model tag */}
      {msg.model && (
        <div style={{ marginTop: 4 }}>
          <Badge variant="gray">{msg.model}</Badge>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 2px", alignItems: "center" }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
            animation: `pulse-dot 1.2s ease ${delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
