"use client";
import { useState } from "react";
import type { Mode } from "../lib/types";
import type { AuthUser } from "../lib/auth";

const GOLD = "#C8A84E";

type TopBarProps = {
  mode: Mode;
  isMobile: boolean;
  authUser?: AuthUser | null;
  onOpenSidebar: () => void;
  sidebarOpen: boolean;
};

/**
 * TopBar — ONLY visible when NOT logged in.
 * Shows "Log in" ghost + "Sign up" gold button, right-aligned.
 * When logged in: returns null (TopBar doesn't exist).
 */
export default function TopBar({ authUser, isMobile }: TopBarProps) {
  const [loginHovered, setLoginHovered] = useState(false);
  const [signupHovered, setSignupHovered] = useState(false);

  // Logged in → no top bar at all
  if (authUser) return null;

  return (
    <div style={{
      position: isMobile ? "fixed" : "sticky",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      height: 48,
      padding: "0 20px",
      background: "var(--bg-primary)",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => { window.location.href = "/login"; }}
          onMouseEnter={() => setLoginHovered(true)}
          onMouseLeave={() => setLoginHovered(false)}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            background: "transparent",
            border: "none",
            color: loginHovered ? "var(--text-primary)" : "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 450,
            cursor: "pointer",
            transition: "color 180ms ease-out",
            whiteSpace: "nowrap",
          }}
        >
          Log in
        </button>
        <button
          onClick={() => { window.location.href = "/signup"; }}
          onMouseEnter={() => setSignupHovered(true)}
          onMouseLeave={() => setSignupHovered(false)}
          style={{
            padding: "7px 20px",
            borderRadius: 8,
            background: signupHovered ? "#D4AF37" : GOLD,
            border: "none",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 180ms ease-out",
            whiteSpace: "nowrap",
          }}
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
