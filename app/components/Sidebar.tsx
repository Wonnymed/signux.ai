"use client";
import { useRef, useEffect } from "react";
import { SquarePen, MessageSquare, Zap, Globe, Settings, X, LogIn, LogOut } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";
import type { AuthUser } from "../lib/auth";

type SidebarProps = {
  mode: Mode;
  setMode: (m: Mode) => void;
  profileName: string;
  lang: string;
  onNewConversation: () => void;
  onOpenSettings: () => void;
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onSignOut?: () => void;
  toggleRef?: React.RefObject<HTMLButtonElement | null>;
  authUser?: AuthUser | null;
};

export default function Sidebar({
  mode, setMode, profileName, lang,
  onNewConversation, onOpenSettings, open, onClose, isLoggedIn, onSignOut,
  toggleRef, authUser,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const handleMode = (m: Mode) => { setMode(m); onClose(); };
  const handleNew = () => { onNewConversation(); onClose(); };
  const handleSettings = () => { onOpenSettings(); onClose(); };

  /* Click outside to close */
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const sidebar = sidebarRef.current;
      const toggle = toggleRef?.current;
      if (sidebar && !sidebar.contains(e.target as Node) &&
          (!toggle || !toggle.contains(e.target as Node))) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose, toggleRef]);

  /* Escape to close */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <aside
      ref={sidebarRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 260,
        zIndex: 200,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 250ms ease",
        pointerEvents: open ? "auto" : "none",
        background: "var(--bg-primary)",
        borderRight: "1px solid var(--border-secondary)",
        boxShadow: open ? "4px 0 12px rgba(0,0,0,0.08)" : "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SignuxIcon color="var(--accent)" size={20} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700,
              letterSpacing: 3, color: "var(--text-primary)",
            }}>SIGNUX</span>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 300,
              letterSpacing: 2, color: "var(--text-primary)", opacity: 0.4,
            }}>AI</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, border: "none", background: "none",
            cursor: "pointer", borderRadius: "var(--radius-xs)",
            color: "var(--text-tertiary)", transition: "color 0.15s",
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* New chat */}
      <div style={{ margin: "0 12px 8px" }}>
        <button
          onClick={handleNew}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "8px 12px", border: "1px solid var(--border-secondary)",
            borderRadius: "var(--radius-sm)", background: "none",
            cursor: "pointer", color: "var(--text-primary)", fontSize: 13,
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          aria-label="New conversation"
        >
          <SquarePen size={16} style={{ flexShrink: 0 }} />
          <span>{mode === "chat" ? t("sidebar.new_chat") : t("sidebar.new_simulation")}</span>
        </button>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 12px 8px" }} />

      {/* Mode buttons */}
      <div style={{ padding: "0 8px 8px" }}>
        {([
          { key: "chat" as Mode, icon: MessageSquare, label: t("sidebar.mode_chat") },
          { key: "simulate" as Mode, icon: Zap, label: t("sidebar.mode_simulate") },
          { key: "intel" as Mode, icon: Globe, label: t("sidebar.mode_intel") },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => handleMode(key)}
            aria-label={label}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "8px 12px", border: "none",
              borderRadius: "var(--radius-xs)", cursor: "pointer",
              background: mode === key ? "var(--bg-hover)" : "none",
              color: mode === key ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: mode === key ? 500 : 400,
              fontSize: 13, transition: "all 0.15s", textAlign: "left",
            }}
            onMouseEnter={e => { if (mode !== key) e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={e => { if (mode !== key) e.currentTarget.style.background = "transparent"; }}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 12px 8px" }} />

      {/* History */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 12px" }}>
        {!isLoggedIn && (
          <div style={{
            padding: "12px 0", fontSize: 12, color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}>
            <a
              href="/login"
              onClick={e => { e.preventDefault(); window.location.href = "/login"; onClose(); }}
              style={{ color: "var(--accent)", textDecoration: "none", cursor: "pointer" }}
            >
              {t("auth.sign_in")}
            </a>
            {" "}
            <span>{t("sidebar.sign_in_to_save")}</span>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid var(--border-secondary)", padding: "8px" }}>
        {/* Settings */}
        <button
          onClick={handleSettings}
          aria-label="Settings"
          style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "8px 12px", border: "none", background: "none",
            borderRadius: "var(--radius-xs)", cursor: "pointer",
            color: "var(--text-secondary)", fontSize: 13, transition: "all 0.15s",
            textAlign: "left",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Settings size={16} style={{ flexShrink: 0 }} />
          <span>{t("sidebar.settings")}</span>
        </button>

        {/* Auth section */}
        {isLoggedIn && profileName ? (
          <>
            <button
              onClick={handleSettings}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "8px 12px", border: "none", background: "none",
                borderRadius: "var(--radius-xs)", cursor: "pointer",
                fontSize: 13, transition: "all 0.15s", textAlign: "left",
                marginTop: 2, color: "var(--text-primary)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {authUser?.avatar ? (
                <img src={authUser.avatar} width={24} height={24} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
              ) : (
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: "rgba(212,175,55,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 600, color: "var(--accent)", flexShrink: 0,
                }}>
                  {userInitials}
                </div>
              )}
              <span style={{ fontWeight: 500 }}>{profileName}</span>
            </button>
            {onSignOut && (
              <button
                onClick={() => { onSignOut(); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "8px 12px", border: "none", background: "none",
                  borderRadius: "var(--radius-xs)", cursor: "pointer",
                  color: "var(--text-secondary)", fontSize: 13, transition: "all 0.15s",
                  textAlign: "left", marginTop: 2,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <LogOut size={16} style={{ flexShrink: 0 }} />
                <span>{t("auth.sign_out")}</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => { window.location.href = "/login"; onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "8px 12px", border: "none", background: "none",
              borderRadius: "var(--radius-xs)", cursor: "pointer",
              color: "var(--text-secondary)", fontSize: 13, transition: "all 0.15s",
              textAlign: "left", marginTop: 2,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <LogIn size={16} style={{ flexShrink: 0 }} />
            <span>{t("auth.sign_in")}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
