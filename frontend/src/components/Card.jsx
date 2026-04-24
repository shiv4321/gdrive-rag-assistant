import React from "react";

export function Card({ children, style = {}, accent = false, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-2)",
        border: `1px solid ${accent ? "var(--border-accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        transition: "border-color var(--transition)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
