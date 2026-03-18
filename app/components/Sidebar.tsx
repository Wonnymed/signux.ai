"use client";
import { PenSquare, MessageSquare, Zap, Globe, Settings, X, LogIn } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
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
  isLoggedIn: boolean;
};

export default function Sidebar({
  mode, setMode, profileName, lang, rates,
  onNewConversation, onOpenSettings, open, onClose, isLoggedIn,
}: SidebarProps) {
  const isMobile = useIsMobile();
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const handleMode = (m: Mode) => { setMode(m); onClose(); };
  const handleNew = () => { onNewConversation(); onClose(); };
  const handleSettings = () => { onOpenSettings(); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="sidebar-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            className="sidebar-drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header: Logo + Close */}
            <div style={{
              padding: "12px 14px", display: "flex", alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SignuxIcon color="var(--accent)" size={24} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{
                    fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700,
                    letterSpacing: 3, color: "var(--text-primary)",
                  }}>SIGNUX</span>
                  <span style={{
                    fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 300,
                    letterSpacing: 2, color: "var(--text-primary)", opacity: 0.5,
                  }}>AI</span>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, border: "none", background: "none",
                  cursor: "pointer", borderRadius: "var(--radius-sm)",
                  color: "var(--text-tertiary)", transition: "color 0.15s",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* New chat */}
            <div style={{ padding: "0 8px 8px" }}>
              <button
                onClick={handleNew}
                className="sidebar-icon-btn"
                style={{ justifyContent: "flex-start" }}
                aria-label="New conversation"
              >
                <PenSquare size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>
                  {mode === "chat" ? t("sidebar.new_chat") : t("sidebar.new_simulation")}
                </span>
              </button>
            </div>

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

                  className={`sidebar-icon-btn${mode === key ? " active" : ""}`}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 12px 8px" }} />

            {/* History */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 8px" }}>
              {isLoggedIn ? (
                <>
                  <div style={{
                    fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)",
                    textTransform: "uppercase", marginBottom: 6, padding: "0 8px",
                  }}>
                    {t("common.today")}
                  </div>
                  {HISTORY_PLACEHOLDERS.slice(0, 2).map(key => (
                    <div
                      key={key}
                      className="sidebar-history-item"
                      style={{
                        padding: "7px 10px", borderRadius: 6, fontSize: 13,
                        color: "var(--text-secondary)", cursor: "pointer",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {t(key)}
                    </div>
                  ))}
                  <div style={{
                    fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)",
                    textTransform: "uppercase", marginTop: 14, marginBottom: 6, padding: "0 8px",
                  }}>
                    {t("common.previous_7_days")}
                  </div>
                  {HISTORY_PLACEHOLDERS.slice(2).map(key => (
                    <div
                      key={key}
                      className="sidebar-history-item"
                      style={{
                        padding: "7px 10px", borderRadius: 6, fontSize: 13,
                        color: "var(--text-secondary)", cursor: "pointer",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {t(key)}
                    </div>
                  ))}
                </>
              ) : (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", padding: "32px 16px", gap: 8,
                  color: "var(--text-tertiary)", fontSize: 13, textAlign: "center",
                }}>
                  <LogIn size={20} style={{ opacity: 0.4 }} />
                  <span>{t("sidebar.sign_in_to_save")}</span>
                </div>
              )}
            </div>

            {/* Bottom */}
            <div style={{ borderTop: "1px solid var(--border-secondary)", padding: "8px" }}>
              {/* Rates */}
              {rates && (
                <div style={{
                  padding: "4px 10px 8px", fontSize: 10,
                  color: "var(--text-tertiary)", fontFamily: "var(--font-mono)",
                }}>
                  USD/BRL {rates.USDBRL?.toFixed(2)} · USD/CNY {rates.USDCNY?.toFixed(2)}
                </div>
              )}

              <div style={{ height: 1, background: "var(--border-secondary)", margin: "6px 4px" }} />

              {/* Settings */}
              <button onClick={handleSettings} className="sidebar-icon-btn" aria-label="Settings">
                <Settings size={18} style={{ flexShrink: 0 }} />
                <span>{t("sidebar.settings")}</span>
              </button>

              {/* Profile (only if logged in) */}
              {isLoggedIn && profileName && (
                <button onClick={handleSettings} className="sidebar-icon-btn" style={{ marginTop: 2 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: "var(--accent-bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600, color: "var(--accent)", flexShrink: 0,
                  }}>
                    {userInitials}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                    {profileName}
                  </span>
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
