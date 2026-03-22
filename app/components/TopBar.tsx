"use client";
import { useState } from "react";
import { Menu, Plus, LogIn } from "lucide-react";
import { ENGINES, type EngineId } from "../lib/engines";
import type { Mode } from "../lib/types";
import type { AuthUser } from "../lib/auth";

/* ═══ Zinc palette — matching sidebar ═══ */
const Z700 = "#3F3F46";
const Z600 = "#52525B";
const Z500 = "#71717A";
const Z400 = "#A1A1AA";
const Z300 = "#D4D4D8";
const Z200 = "#E4E4E7";
const Z800 = "#27272A";

type TopBarProps = {
  mode: Mode;
  isMobile: boolean;
  authUser?: AuthUser | null;
  onOpenSidebar: () => void;
  onNewConversation: () => void;
  onSignOut?: () => void;
  tokenStatus?: { available: number; monthlyTotal: number; plan: string };
  sidebarOpen: boolean;
};

export default function TopBar({
  mode, isMobile, authUser, onOpenSidebar, onNewConversation,
  tokenStatus, sidebarOpen,
}: TopBarProps) {
  const engineName = ENGINES[mode as EngineId]?.name || (mode === "chat" ? "Home" : mode);
  const engineSubtitle = ENGINES[mode as EngineId]?.subtitle || (mode === "chat" ? "Your AI business advisor." : "");

  if (isMobile) {
    return <MobileTopBar
      engineName={engineName}
      authUser={authUser}
      onOpenSidebar={onOpenSidebar}
    />;
  }

  return <DesktopTopBar
    engineName={engineName}
    engineSubtitle={engineSubtitle}
    authUser={authUser}
    onNewConversation={onNewConversation}
    tokenStatus={tokenStatus}
    sidebarOpen={sidebarOpen}
  />;
}

/* ═══ DESKTOP — slim context bar ═══ */
function DesktopTopBar({
  engineName, engineSubtitle, authUser, onNewConversation, tokenStatus, sidebarOpen,
}: {
  engineName: string;
  engineSubtitle: string;
  authUser?: AuthUser | null;
  onNewConversation: () => void;
  tokenStatus?: { available: number; monthlyTotal: number; plan: string };
  sidebarOpen: boolean;
}) {
  const [newHovered, setNewHovered] = useState(false);
  const [loginHovered, setLoginHovered] = useState(false);
  const [signupHovered, setSignupHovered] = useState(false);

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 30,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 48,
      padding: "0 24px",
      background: "var(--bg-primary)",
      borderBottom: `1px solid ${Z800}`,
      flexShrink: 0,
    }}>
      {/* LEFT — Context */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
        <span style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: Z200,
          letterSpacing: 0.2,
        }}>
          {engineName}
        </span>
        <span style={{
          fontSize: 11.5,
          fontWeight: 400,
          color: Z600,
          letterSpacing: 0.1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {engineSubtitle}
        </span>
      </div>

      {/* RIGHT — Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Token counter */}
        {tokenStatus && authUser && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
          }}>
            <span style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              letterSpacing: 0.4,
              color: tokenStatus.available <= 0 ? "#EF4444" : Z600,
            }}>
              {tokenStatus.available >= 1000
                ? `${(tokenStatus.available / 1000).toFixed(1)}K`
                : tokenStatus.available} ST
            </span>
          </div>
        )}

        {/* New conversation */}
        {authUser && (
          <button
            onClick={onNewConversation}
            onMouseEnter={() => setNewHovered(true)}
            onMouseLeave={() => setNewHovered(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              background: newHovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              color: newHovered ? Z300 : Z500,
              fontSize: 12,
              fontWeight: 450,
              cursor: "pointer",
              transition: "background 180ms ease-out, color 180ms ease-out",
            }}
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>New</span>
          </button>
        )}

        {/* Auth buttons — not logged in */}
        {!authUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => { window.location.href = "/login"; }}
              onMouseEnter={() => setLoginHovered(true)}
              onMouseLeave={() => setLoginHovered(false)}
              style={{
                padding: "5px 14px",
                borderRadius: 7,
                background: "transparent",
                border: `1px solid ${loginHovered ? Z600 : Z800}`,
                color: loginHovered ? Z200 : Z500,
                fontSize: 12,
                fontWeight: 450,
                cursor: "pointer",
                transition: "border-color 180ms ease-out, color 180ms ease-out",
              }}
            >
              Log in
            </button>
            <button
              onClick={() => { window.location.href = "/signup"; }}
              onMouseEnter={() => setSignupHovered(true)}
              onMouseLeave={() => setSignupHovered(false)}
              style={{
                padding: "5px 14px",
                borderRadius: 7,
                background: signupHovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)",
                border: "none",
                color: Z200,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 180ms ease-out",
              }}
            >
              Start free
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ MOBILE — refined header ═══ */
function MobileTopBar({
  engineName, authUser, onOpenSidebar,
}: {
  engineName: string;
  authUser?: AuthUser | null;
  onOpenSidebar: () => void;
}) {
  return (
    <header style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px",
      height: 48,
      background: "var(--bg-primary)",
      borderBottom: `1px solid ${Z800}`,
    }}>
      {/* LEFT — hamburger */}
      <button
        onClick={onOpenSidebar}
        style={{
          width: 40, height: 40, borderRadius: 8,
          background: "transparent", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: Z500,
          transition: "color 180ms ease-out",
        }}
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>

      {/* CENTER — context */}
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: Z300,
        letterSpacing: 0.3,
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
      }}>
        {engineName}
      </span>

      {/* RIGHT — auth or avatar */}
      {!authUser ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => { window.location.href = "/login"; }}
            style={{
              padding: "6px 12px", borderRadius: 7,
              background: "transparent",
              border: `1px solid ${Z800}`,
              color: Z500,
              fontSize: 11.5, fontWeight: 450, cursor: "pointer",
              transition: "border-color 180ms ease-out, color 180ms ease-out",
            }}
          >
            Log in
          </button>
          <button
            onClick={() => { window.location.href = "/signup"; }}
            style={{
              padding: "6px 12px", borderRadius: 7,
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: Z200,
              fontSize: 11.5, fontWeight: 500, cursor: "pointer",
              transition: "background 180ms ease-out",
            }}
          >
            Start free
          </button>
        </div>
      ) : (
        <button
          onClick={onOpenSidebar}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            overflow: "hidden", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", padding: 0,
          }}
        >
          {authUser.avatar ? (
            <img src={authUser.avatar} alt={authUser.name} width={28} height={28}
              style={{ borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${Z800}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 600, color: Z400,
            }}>
              {authUser.initials}
            </div>
          )}
        </button>
      )}
    </header>
  );
}
