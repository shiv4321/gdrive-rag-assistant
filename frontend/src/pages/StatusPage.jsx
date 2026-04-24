import React, { useState, useEffect } from "react";
import {
  Database, Layers, Cpu, RefreshCw,
  TrendingUp, Globe, CheckCircle,
} from "lucide-react";
import { stats, health } from "../lib/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";

export default function StatusPage() {
  const [healthData, setHealthData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([health(), stats()]);
      setHealthData(h);
      setStatsData(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const isOnline = healthData?.status === "ok";

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "28px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
              System Status
            </h1>
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              Live health and Pinecone index statistics
            </p>
          </div>
          <Button variant="ghost" onClick={load} loading={loading} size="sm">
            <RefreshCw size={13} />
            Refresh
          </Button>
        </div>

        {/* System health row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <StatCard
            icon={<CheckCircle size={18} color={isOnline ? "var(--accent)" : "var(--red)"} />}
            label="API Status"
            value={isOnline ? "Online" : "Offline"}
            accent={isOnline}
            loading={loading}
          />
          <StatCard
            icon={<Database size={18} color="var(--blue)" />}
            label="Total Vectors"
            value={statsData?.total_vector_count?.toLocaleString() ?? "—"}
            loading={loading}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
          <StatCard
            icon={<Layers size={18} color="var(--yellow)" />}
            label="Dimensions"
            value={statsData?.dimension ?? "—"}
            loading={loading}
          />
          <StatCard
            icon={<TrendingUp size={18} color="#CC88FF" />}
            label="Index Fullness"
            value={statsData?.index_fullness != null
              ? `${(statsData.index_fullness * 100).toFixed(2)}%`
              : "—"}
            loading={loading}
          />
        </div>

        {/* Architecture overview */}
        <div style={{ marginBottom: 10, fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
          ARCHITECTURE
        </div>
        <Card>
          <PipelineStep
            icon={<Globe size={14} />}
            label="Google Drive"
            desc="OAuth / Service Account · PDF, Docs, DOCX, TXT"
            badge={{ label: "connector", variant: "blue" }}
          />
          <Divider />
          <PipelineStep
            icon={<Layers size={14} />}
            label="Processing"
            desc="PyMuPDF · python-docx · tiktoken chunking (512 tok / 64 overlap)"
            badge={{ label: "pipeline", variant: "gray" }}
          />
          <Divider />
          <PipelineStep
            icon={<Cpu size={14} />}
            label="Embedding"
            desc="Pinecone Inference · llama-text-embed-v2 · 1024-dim"
            badge={{ label: "embedding", variant: "yellow" }}
          />
          <Divider />
          <PipelineStep
            icon={<Database size={14} />}
            label="Vector Store"
            desc="Pinecone (us-east-1) · cosine similarity · metadata filtering"
            badge={{ label: "storage", variant: "green" }}
          />
          <Divider />
          <PipelineStep
            icon={<TrendingUp size={14} />}
            label="LLM Answer"
            desc="OpenAI GPT-4o-mini · RAG prompt · grounded citations"
            badge={{ label: "llm", variant: "blue" }}
            last
          />
        </Card>

        {/* Version info */}
        <div style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            Highwatch RAG v{healthData?.version ?? "1.0.0"}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            FastAPI · Pinecone · OpenAI
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent, loading }) {
  return (
    <Card accent={accent}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {icon}
        <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
          {label}
        </span>
      </div>
      {loading ? (
        <div style={{
          height: 28,
          borderRadius: 6,
          background: "linear-gradient(90deg, var(--bg-3) 25%, var(--bg-4) 50%, var(--bg-3) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s linear infinite",
          width: "60%",
        }} />
      ) : (
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 24,
          fontWeight: 700,
          color: accent ? "var(--accent)" : "var(--text)",
          lineHeight: 1,
        }}>
          {value}
        </div>
      )}
    </Card>
  );
}

function PipelineStep({ icon, label, desc, badge, last }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      paddingBottom: last ? 0 : 0,
    }}>
      <div style={{
        width: 30, height: 30, flexShrink: 0,
        background: "var(--bg-3)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-2)",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      width: 1, height: 18,
      background: "var(--border)",
      margin: "6px 0 6px 14px",
    }} />
  );
}
