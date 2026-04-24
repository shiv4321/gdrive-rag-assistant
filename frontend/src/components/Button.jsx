import React from "react";

export function Button({ children, onClick, variant = "primary", disabled, loading, style = {}, size = "md" }) {
  const isDisabled = disabled || loading;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    borderRadius: "var(--radius)",
    transition: "all var(--transition)",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.5 : 1,
    border: "1px solid transparent",
    outline: "none",
    whiteSpace: "nowrap",
  };

  const sizes = {
    sm: { padding: "6px 14px", fontSize: 13 },
    md: { padding: "10px 20px", fontSize: 14 },
    lg: { padding: "13px 26px", fontSize: 15 },
  };

  const variants = {
    primary: {
      background: "var(--accent)",
      color: "#0A0A0F",
      borderColor: "var(--accent)",
    },
    secondary: {
      background: "var(--bg-3)",
      color: "var(--text)",
      borderColor: "var(--border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-2)",
      borderColor: "var(--border)",
    },
    danger: {
      background: "rgba(255,68,102,0.12)",
      color: "var(--red)",
      borderColor: "rgba(255,68,102,0.3)",
    },
  };

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {loading && (
        <span style={{
          width: 14, height: 14,
          border: "2px solid currentColor",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
          flexShrink: 0,
        }} />
      )}
      {children}
    </button>
  );
}
