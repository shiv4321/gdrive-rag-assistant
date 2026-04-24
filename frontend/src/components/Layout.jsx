import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  RefreshCw,
  Activity,
  BookOpen,
  Zap,
} from "lucide-react";
import { useHealth } from "../hooks/useHealth";
import { Badge } from "./Badge";

const NAV = [
  { path: "/",       icon: MessageSquare, label: "Ask Anything" },
  { path: "/sync",   icon: RefreshCw,     label: "Sync Drive"   },
  { path: "/status", icon: Activity,      label: "Status"       },
];

export function Layout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: healthData } = useHealth();
  const vectors = healthData?.pinecone_vectors ?? "—";
  const isOnline = healthData?.status === "ok";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: "var(--bg-2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "0 0 20px",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: "var(--accent-dim)",
              border: "1px solid var(--border-accent)",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={16} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                Highwatch
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                RAG Engine
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 10px" }}>
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: "var(--radius)",
                  marginBottom: 2,
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-2)",
                  border: active ? "1px solid var(--border-accent)" : "1px solid transparent",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  transition: "all var(--transition)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Footer stats */}
        <div style={{
          margin: "0 10px",
          padding: "12px 14px",
          background: "var(--bg-3)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Backend
            </span>
            <Badge variant={isOnline ? "green" : "red"} dot>
              {isOnline ? "online" : "offline"}
            </Badge>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Vectors
            </span>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
              {typeof vectors === "number" ? vectors.toLocaleString() : vectors}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
    </div>
  );
}
