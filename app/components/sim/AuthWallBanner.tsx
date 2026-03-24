"use client";

import { useState } from "react";

export default function AuthWallBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [hoverSignup, setHoverSignup] = useState(false);
  const [hoverLogin, setHoverLogin] = useState(false);

  if (dismissed) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(124,58,237,0.20)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        background: "rgba(124,58,237,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Your analysis is ready. Sign up free to save it and run more.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <a
          href="/auth/signup"
          onMouseEnter={() => setHoverSignup(true)}
          onMouseLeave={() => setHoverSignup(false)}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--radius-md)",
            background: hoverSignup ? "var(--accent-hover)" : "var(--accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            transition: "background var(--transition-normal)",
          }}
        >
          Sign up free
        </a>
        <a
          href="/auth/login"
          onMouseEnter={() => setHoverLogin(true)}
          onMouseLeave={() => setHoverLogin(false)}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${hoverLogin ? "var(--accent)" : "var(--border-default)"}`,
            background: "transparent",
            color: hoverLogin ? "var(--accent)" : "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            transition: "all var(--transition-normal)",
          }}
        >
          Log in
        </a>
        <button
          onClick={() => setDismissed(true)}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-md)",
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
