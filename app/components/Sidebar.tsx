"use client";
import { PenSquare, MessageSquare, Zap, Globe, Settings } from "lucide-react";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";

const HISTORY_PLACEHOLDERS = [
  "sidebar.history.1", "sidebar.history.2", "sidebar.history.3",
  "sidebar.history.4", "sidebar.history.5",
];

type SidebarProps = {
  mode: Mode;
  setMode: (m: Mode) => void;
  profileName: string;
  lang: string;
  rates: any;
  onNewConversation: () => void;
  onOpenSettings: () => void;
};

export default function Sidebar({ mode, setMode, profileName, lang, rates, onNewConversation, onOpenSettings }: SidebarProps) {
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  return (
    <aside className="sidebar-rail">
      {/* Logo area */}
      <div style={{ padding: "16px 14px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "var(--accent)", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>
          S
        </div>
        <span className="sidebar-logo-text" style={{
          fontSize: 13, fontWeight: 600, letterSpacing: "0.1em",
          color: "var(--text-secondary)",
        }}>
          SIGNUX
        </span>
      </div>

      {/* New chat */}
      <div style={{ padding: "0 8px 8px" }}>
        <button
          onClick={onNewConversation}
          className="sidebar-icon-btn"
          style={{ justifyContent: "center" }}
          aria-label="New conversation"
        >
          <PenSquare size={18} style={{ flexShrink: 0 }} />
          <span className="sidebar-label" style={{ fontSize: 13 }}>
            {mode === "chat" ? t("sidebar.new_chat") : t("sidebar.new_simulation")}
          </span>
        </button>
      </div>

      <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 12px 8px" }} />

      {/* History — only visible when expanded */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 8px" }}>
        <div className="sidebar-label" style={{
          fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)",
          textTransform: "uppercase", marginBottom: 6, padding: "0 8px",
        }}>
          {t("common.today")}
        </div>
        {HISTORY_PLACEHOLDERS.slice(0, 2).map(key => (
          <div
            key={key}
            className="sidebar-label sidebar-history-item"
            style={{
              padding: "7px 10px", borderRadius: 6, fontSize: 13,
              color: "var(--text-secondary)", cursor: "pointer",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {t(key)}
          </div>
        ))}
        <div className="sidebar-label" style={{
          fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)",
          textTransform: "uppercase", marginTop: 14, marginBottom: 6, padding: "0 8px",
        }}>
          {t("common.previous_7_days")}
        </div>
        {HISTORY_PLACEHOLDERS.slice(2).map(key => (
          <div
            key={key}
            className="sidebar-label sidebar-history-item"
            style={{
              padding: "7px 10px", borderRadius: 6, fontSize: 13,
              color: "var(--text-secondary)", cursor: "pointer",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {t(key)}
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div style={{ borderTop: "1px solid var(--border-secondary)", padding: "8px" }}>
        {/* Rates — only when expanded */}
        {rates && (
          <div className="sidebar-label" style={{
            padding: "4px 10px 8px", fontSize: 10,
            color: "var(--text-tertiary)", fontFamily: "var(--font-mono)",
          }}>
            USD/BRL {rates.USDBRL?.toFixed(2)} · USD/CNY {rates.USDCNY?.toFixed(2)}
          </div>
        )}

        {/* Mode buttons */}
        {([
          { key: "chat" as Mode, icon: MessageSquare, label: t("sidebar.mode_chat") },
          { key: "simulate" as Mode, icon: Zap, label: t("sidebar.mode_simulate") },
          { key: "intel" as Mode, icon: Globe, label: t("sidebar.mode_intel") },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            data-tour={key === "simulate" ? "simulate-mode" : key === "intel" ? "intel-mode" : undefined}
            className={`sidebar-icon-btn${mode === key ? " active" : ""}`}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span className="sidebar-label">{label}</span>
          </button>
        ))}

        <div style={{ height: 1, background: "var(--border-secondary)", margin: "6px 4px" }} />

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="sidebar-icon-btn"
          aria-label="Settings"
        >
          <Settings size={18} style={{ flexShrink: 0 }} />
          <span className="sidebar-label">{t("sidebar.settings")}</span>
        </button>

        {/* Profile */}
        <button
          onClick={onOpenSettings}
          data-tour="profile-settings"
          className="sidebar-icon-btn"
          style={{ marginTop: 2 }}
        >
          <div style={{
            width: 24, height: 24, borderRadius: "50%", background: "var(--accent-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 600, color: "var(--accent)", flexShrink: 0,
          }}>
            {userInitials}
          </div>
          <span className="sidebar-label" style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
            {profileName}
          </span>
        </button>
      </div>
    </aside>
  );
}
