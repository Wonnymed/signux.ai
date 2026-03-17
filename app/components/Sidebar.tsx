"use client";
import { PanelLeft, PenSquare, MessageSquare, Zap, Globe, Settings } from "lucide-react";
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
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ mode, setMode, profileName, lang, rates, onNewConversation, onOpenSettings, open, onClose }: SidebarProps) {
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  return (
    <aside className="sidebar" style={{ padding: "12px 10px", display: "flex", flexDirection: "column" }}>
      {/* Top row: close button + logo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px", marginBottom: 12 }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6 }}
        >
          <PanelLeft size={18} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>Signux</span>
      </div>

      {/* New chat */}
      <button
        onClick={() => { onNewConversation(); onClose(); }}
        className="hover-border"
        style={{
          width: "100%", fontSize: 13, color: "var(--text-secondary)", cursor: "pointer",
          padding: "10px 12px", background: "none", border: "1px solid var(--border-secondary)",
          borderRadius: "var(--radius-sm)", textAlign: "left", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
        }}
      >
        <PenSquare size={14} />
        {mode === "chat" ? t("sidebar.new_chat") : t("sidebar.new_simulation")}
      </button>

      <div style={{ height: 1, background: "var(--border-secondary)", marginBottom: 10 }} />

      {/* History section */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>
          {t("common.today")}
        </div>
        {HISTORY_PLACEHOLDERS.slice(0, 2).map((key, i) => (
          <div
            key={key}
            style={{
              padding: "8px 10px", borderRadius: 6, fontSize: 13,
              color: "var(--text-secondary)", cursor: "pointer",
              transition: "background 0.1s", marginBottom: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            className="sidebar-history-item"
          >
            {t(key)}
          </div>
        ))}
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)", textTransform: "uppercase", marginTop: 16, marginBottom: 8, padding: "0 4px" }}>
          {t("common.previous_7_days")}
        </div>
        {HISTORY_PLACEHOLDERS.slice(2).map(key => (
          <div
            key={key}
            style={{
              padding: "8px 10px", borderRadius: 6, fontSize: 13,
              color: "var(--text-secondary)", cursor: "pointer",
              transition: "background 0.1s", marginBottom: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            className="sidebar-history-item"
          >
            {t(key)}
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div style={{ borderTop: "1px solid var(--border-secondary)", paddingTop: 8, marginTop: 8 }}>
        {/* Rates */}
        {rates && (
          <div style={{ padding: "4px 8px 8px", fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            USD/BRL {rates.USDBRL?.toFixed(2)} · USD/CNY {rates.USDCNY?.toFixed(2)}
          </div>
        )}

        {/* Mode toggle as menu items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 8 }}>
          {([
            { key: "chat" as Mode, icon: MessageSquare, label: t("sidebar.mode_chat") },
            { key: "simulate" as Mode, icon: Zap, label: t("sidebar.mode_simulate") },
            { key: "intel" as Mode, icon: Globe, label: t("sidebar.mode_intel") },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setMode(key); onClose(); }}
              data-tour={key === "simulate" ? "simulate-mode" : key === "intel" ? "intel-mode" : undefined}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", border: "none", borderRadius: 6,
                cursor: "pointer", fontSize: 13, transition: "all 0.15s",
                background: mode === key ? "var(--bg-hover)" : "transparent",
                color: mode === key ? "var(--text-primary)" : "var(--text-tertiary)",
                fontWeight: mode === key ? 500 : 400,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: "var(--border-secondary)", marginBottom: 8 }} />

        {/* Profile */}
        <button
          onClick={onOpenSettings}
          data-tour="profile-settings"
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "8px 8px", background: "none", border: "none",
            cursor: "pointer", borderRadius: 6, transition: "background 0.1s",
          }}
          className="sidebar-history-item"
        >
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--accent-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "var(--accent)", flexShrink: 0,
          }}>
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{profileName}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
