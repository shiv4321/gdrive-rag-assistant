import React from "react";

const variants = {
  green:  { bg: "rgba(0,255,136,0.1)",  color: "#00FF88", border: "rgba(0,255,136,0.25)" },
  red:    { bg: "rgba(255,68,102,0.1)", color: "#FF4466", border: "rgba(255,68,102,0.25)" },
  yellow: { bg: "rgba(255,209,102,0.1)",color: "#FFD166", border: "rgba(255,209,102,0.25)" },
  blue:   { bg: "rgba(68,136,255,0.1)", color: "#4488FF", border: "rgba(68,136,255,0.25)" },
  gray:   { bg: "rgba(255,255,255,0.05)", color: "#8888a0", border: "rgba(255,255,255,0.1)" },
};

export function Badge({ children, variant = "gray", dot = false, style = {} }) {
  const v = variants[variant] || variants.gray;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "2px 8px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 500,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.03em",
      background: v.bg,
      color: v.color,
      border: `1px solid ${v.border}`,
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6,
          borderRadius: "50%",
          background: v.color,
          animation: "pulse-dot 2s ease infinite",
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
