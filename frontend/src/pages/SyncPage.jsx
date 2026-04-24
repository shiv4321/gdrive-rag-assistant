import React, { useState } from "react";
import {
  RefreshCw, CheckCircle, XCircle,
  SkipForward, FolderOpen, Info,
} from "lucide-react";
import { syncDrive } from "../lib/api";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";

export default function SyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [folderId, setFolderId] = useState("");
  const [forceResync, setForceResync] = useState(false);

  async function handleSync() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await syncDrive({
        folder_id: folderId.trim() || null,
        force_resync: forceResync,
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "28px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
            Sync Google Drive
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            Fetch documents from Drive, extract text, embed with llama-text-embed-v2, and store in Pinecone.
          </p>
        </div>

        {/* Config Card */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-2)", marginBottom: 7, fontFamily: "var(--font-mono)" }}>
              FOLDER ID (optional)
            </label>
            <input
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Restrict sync to a specific Drive folder ID…"
              style={{
                width: "100%",
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text)",
                padding: "9px 14px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                outline: "none",
                transition: "border-color var(--transition)",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--border-accent)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
              Leave blank to sync your entire Drive
            </p>
          </div>

          <label style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", userSelect: "none",
          }}>
            <div
              onClick={() => setForceResync(!forceResync)}
              style={{
                width: 36, height: 20,
                background: forceResync ? "var(--accent)" : "var(--bg-4)",
                border: `1px solid ${forceResync ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 99,
                position: "relative",
                transition: "all var(--transition)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute",
                top: 2, left: forceResync ? 17 : 2,
                width: 14, height: 14,
                background: forceResync ? "#0A0A0F" : "var(--text-3)",
                borderRadius: "50%",
                transition: "left var(--transition)",
              }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Force re-sync</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                Re-process all files even if already indexed
              </div>
            </div>
          </label>
        </Card>

        {/* Supported Formats Info */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 16px",
          background: "rgba(68,136,255,0.06)",
          border: "1px solid rgba(68,136,255,0.18)",
          borderRadius: "var(--radius)",
          marginBottom: 20,
          fontSize: 13,
          color: "var(--text-2)",
        }}>
          <Info size={15} color="var(--blue)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Supported: <strong style={{ color: "var(--text)" }}>PDF</strong>, {" "}
            <strong style={{ color: "var(--text)" }}>Google Docs</strong>, {" "}
            <strong style={{ color: "var(--text)" }}>DOCX</strong>, {" "}
            <strong style={{ color: "var(--text)" }}>TXT</strong>
          </span>
        </div>

        {/* Action */}
        <Button onClick={handleSync} loading={loading} disabled={loading} size="lg" style={{ width: "100%" }}>
          <RefreshCw size={16} />
          {loading ? "Syncing Drive…" : "Start Sync"}
        </Button>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 20,
            padding: "14px 18px",
            background: "rgba(255,68,102,0.08)",
            border: "1px solid rgba(255,68,102,0.25)",
            borderRadius: "var(--radius)",
            color: "var(--red)",
            fontSize: 14,
            animation: "fadeUp 0.25s ease",
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && <SyncResults result={result} />}
      </div>
    </div>
  );
}

function SyncResults({ result }) {
  const stats = [
    { label: "Files Found",    value: result.total_files_found, color: "var(--text)" },
    { label: "Synced",         value: result.synced,            color: "var(--accent)" },
    { label: "Skipped",        value: result.skipped,           color: "var(--yellow)" },
    { label: "Errors",         value: result.errors,            color: "var(--red)" },
  ];

  return (
    <div style={{ marginTop: 28, animation: "fadeUp 0.3s ease" }}>
      {/* Summary pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "14px 16px",
            textAlign: "center",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Per-file table */}
      <div style={{ fontSize: 13, marginBottom: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
        FILE RESULTS
      </div>
      <div style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}>
        {result.files.map((file, i) => (
          <div
            key={file.doc_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
              borderBottom: i < result.files.length - 1 ? "1px solid var(--border)" : "none",
              animation: `fadeUp 0.25s ease ${i * 0.04}s both`,
            }}
          >
            <StatusIcon status={file.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {file.file_name}
              </div>
              {file.error && (
                <div style={{ fontSize: 11, color: "var(--red)", marginTop: 2 }}>
                  {file.error}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {file.chunks_upserted > 0 && (
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>
                  {file.chunks_upserted} chunks
                </span>
              )}
              <StatusBadge status={file.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "synced")  return <CheckCircle size={15} color="var(--accent)" />;
  if (status === "error")   return <XCircle     size={15} color="var(--red)" />;
  return <SkipForward size={15} color="var(--yellow)" />;
}

function StatusBadge({ status }) {
  const map = { synced: "green", error: "red", skipped: "yellow" };
  return <Badge variant={map[status] || "gray"}>{status}</Badge>;
}
