"use client";
import { useRef, useEffect } from "react";
import { SquarePen, MessageSquare, Zap, Globe, Settings, X, LogIn, LogOut } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";

type SidebarProps = {
  mode: Mode;
  setMode: (m: Mode) => void;
  profileName: string;
  lang: string;
  onNewConversation: () => void;
  onOpenSettings: () => void;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  isLoggedIn: boolean;
  onSignOut?: () => void;
  isMobile: boolean;
};

const MODES = [
  { key: "chat" as Mode, icon: MessageSquare, label: "sidebar.mode_chat" },
  { key: "simulate" as Mode, icon: Zap, label: "sidebar.mode_simulate" },
  { key: "intel" as Mode, icon: Globe, label: "sidebar.mode_intel" },
];

export default function Sidebar({
  mode, setMode, profileName, onNewConversation, onOpenSettings,
  open, onClose, onOpen, isLoggedIn, onSignOut, isMobile,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const handleMode = (m: Mode) => { setMode(m); if (isMobile) onClose(); };
  const handleNew = () => { onNewConversation(); if (isMobile) onClose(); };
  const handleSettings = () => { onOpenSettings(); if (isMobile) onClose(); };

  // Mobile: click outside to close
  useEffect(() => {
    if (!isMobile || !open) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMobile, open, onClose]);

  // Escape to close on mobile
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && open && isMobile) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, isMobile]);

  const iconSize = 18;
  const iconBtnSize = 36;

  // Mobile overlay style
  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 199 }} />}
        <aside ref={sidebarRef} style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 200,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms ease",
          background: "var(--bg-primary)", borderRight: "1px solid var(--border-secondary)",
          display: "flex", flexDirection: "column",
        }}>
          {renderExpandedContent()}
        </aside>
      </>
    );
  }

  // Desktop: expanded or collapsed
  const width = open ? 240 : 56;
  return (
    <aside ref={sidebarRef} style={{
      width, minWidth: width, transition: "width 200ms ease, min-width 200ms ease",
      background: "var(--bg-primary)", borderRight: "1px solid var(--border-secondary)",
      display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
    }}>
      {open ? renderExpandedContent() : renderCollapsedContent()}
    </aside>
  );

  // ═══ EXPANDED (full sidebar with text) ═══
  function renderExpandedContent() {
    return (
      <>
        {/* Header: logo + close */}
        <div style={{ padding: "14px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SignuxIcon color="var(--accent)" size={20} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "var(--text-primary)" }}>SIGNUX</span>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 300, letterSpacing: 2, color: "var(--text-primary)", opacity: 0.4 }}>AI</span>
            </div>
          </div>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "none", cursor: "pointer", borderRadius: "var(--radius-xs)", color: "var(--text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        {/* New conversation */}
        <div style={{ padding: "0 8px 8px" }}>
          <button onClick={handleNew} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", border: "1px solid var(--border-secondary)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: 13, transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <SquarePen size={16} /> <span>{t("sidebar.new_chat")}</span>
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 8px 8px" }} />

        {/* Mode buttons */}
        <div style={{ padding: "0 8px 8px" }}>
          {MODES.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => handleMode(key)} style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none",
              borderRadius: "var(--radius-xs)", cursor: "pointer", fontSize: 13, transition: "all 0.15s", textAlign: "left",
              background: mode === key ? "var(--bg-hover)" : "none",
              color: mode === key ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: mode === key ? 500 : 400,
            }} onMouseEnter={e => { if (mode !== key) e.currentTarget.style.background = "var(--bg-hover)"; }}
               onMouseLeave={e => { if (mode !== key) e.currentTarget.style.background = "transparent"; }}>
              <Icon size={16} /> <span>{t(label)}</span>
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 8px 8px" }} />

        {/* History placeholder */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
          {!isLoggedIn && (
            <div style={{ padding: "12px 0", fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              <a href="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>{t("auth.sign_in")}</a>{" "}
              <span>{t("sidebar.sign_in_to_save")}</span>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid var(--border-secondary)", padding: 8 }}>
          <button onClick={handleSettings} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none", background: "none", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Settings size={16} /> <span>{t("sidebar.settings")}</span>
          </button>
          {isLoggedIn && onSignOut ? (
            <button onClick={() => { onSignOut(); if (isMobile) onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none", background: "none", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left", marginTop: 2 }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <LogOut size={16} /> <span>{t("auth.sign_out")}</span>
            </button>
          ) : (
            <button onClick={() => { window.location.href = "/login"; }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none", background: "none", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left", marginTop: 2 }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <LogIn size={16} /> <span>{t("auth.sign_in")}</span>
            </button>
          )}
        </div>
      </>
    );
  }

  // ═══ COLLAPSED (icons only) ═══
  function renderCollapsedContent() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", paddingTop: 10 }}>
        {/* Logo icon — click to expand */}
        <button onClick={onOpen} title="Open sidebar" style={{ width: iconBtnSize, height: iconBtnSize, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <SignuxIcon color="var(--accent)" size={22} />
        </button>

        {/* New conversation */}
        <button onClick={handleNew} title={t("sidebar.new_chat")} style={{ width: iconBtnSize, height: iconBtnSize, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", marginBottom: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <SquarePen size={iconSize} />
        </button>

        <div style={{ height: 1, width: 24, background: "var(--border-secondary)", margin: "4px 0" }} />

        {/* Mode icons */}
        {MODES.map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => handleMode(key)} title={t(label)} style={{
            width: iconBtnSize, height: iconBtnSize, display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2,
            background: mode === key ? "var(--bg-hover)" : "none",
            color: mode === key ? "var(--accent)" : "var(--text-tertiary)",
          }} onMouseEnter={e => { if (mode !== key) e.currentTarget.style.background = "var(--bg-hover)"; }}
             onMouseLeave={e => { if (mode !== key) e.currentTarget.style.background = "transparent"; }}>
            <Icon size={iconSize} />
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom icons */}
        <button onClick={handleSettings} title={t("sidebar.settings")} style={{ width: iconBtnSize, height: iconBtnSize, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", color: "var(--text-tertiary)", marginBottom: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Settings size={iconSize} />
        </button>
        {isLoggedIn ? (
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(212,175,55,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "var(--accent)", marginBottom: 10 }}>
            {userInitials}
          </div>
        ) : (
          <button onClick={() => { window.location.href = "/login"; }} title={t("auth.sign_in")} style={{ width: iconBtnSize, height: iconBtnSize, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", color: "var(--text-tertiary)", marginBottom: 10 }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <LogIn size={iconSize} />
          </button>
        )}
      </div>
    );
  }
}
