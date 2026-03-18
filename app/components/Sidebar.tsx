"use client";
import { useRef, useEffect, useState } from "react";
import { SquarePen, MessageSquare, Zap, Globe, Settings, LogIn, LogOut, Trash2 } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";
import type { AuthUser } from "../lib/auth";
import type { Conversation } from "../lib/database-client";

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
  authUser?: AuthUser | null;
  conversations?: Conversation[];
  loadingHistory?: boolean;
  activeConversationId?: string | null;
  onLoadConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
};

const MODES = [
  { key: "chat" as Mode, icon: MessageSquare, label: "sidebar.mode_chat" },
  { key: "simulate" as Mode, icon: Zap, label: "sidebar.mode_simulate" },
  { key: "intel" as Mode, icon: Globe, label: "sidebar.mode_intel" },
];

/* Sidebar panel toggle icon — two rectangles like Okara */
function SidebarToggleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

/* ═══ Date Grouping ═══ */
function groupByDate(convs: Conversation[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  convs.forEach(c => {
    const d = new Date(c.updated_at);
    if (d >= todayStart) groups[0].items.push(c);
    else if (d >= yesterdayStart) groups[1].items.push(c);
    else if (d >= weekStart) groups[2].items.push(c);
    else groups[3].items.push(c);
  });

  return groups.filter(g => g.items.length > 0);
}

/* ═══ Conversation History Item ═══ */
function ConversationItem({ conv, isActive, onLoad, onDelete }: {
  conv: Conversation;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const title = conv.title || "New conversation";

  return (
    <button
      onClick={onLoad}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "8px 12px", border: "none",
        borderRadius: "var(--radius-xs)", cursor: "pointer",
        fontSize: 13, textAlign: "left", position: "relative",
        background: isActive ? "var(--bg-hover)" : hovering ? "var(--bg-hover)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        fontWeight: isActive ? 500 : 400,
        transition: "all 0.15s",
      }}
    >
      <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
      <span style={{
        flex: 1, overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap", minWidth: 0,
      }}>
        {title}
      </span>
      {hovering && (
        <span
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: "var(--radius-xs)",
            color: "var(--text-tertiary)", flexShrink: 0,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error, #e53e3e)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
        >
          <Trash2 size={13} />
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  mode, setMode, profileName, onNewConversation, onOpenSettings,
  open, onClose, onOpen, isLoggedIn, onSignOut, isMobile, authUser,
  conversations = [], loadingHistory = false, activeConversationId, onLoadConversation, onDeleteConversation,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : (authUser?.initials || "?");
  const displayName = profileName || authUser?.name || "";

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
          position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 200,
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
  const width = open ? 280 : 56;
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
        {/* Header: S logo + SIGNUX AI + toggle right */}
        <div style={{ padding: "12px 12px 12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SignuxIcon variant="gold" size={24} />
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "var(--text-primary)" }}>
              SIGNUX <span style={{ fontWeight: 300, opacity: 0.4 }}>AI</span>
            </span>
          </div>
          <button onClick={onClose} title="Close sidebar" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, border: "none", background: "none",
            cursor: "pointer", borderRadius: "var(--radius-xs)",
            color: "var(--text-tertiary)", transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}>
            <SidebarToggleIcon size={18} />
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

        {/* History area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {loadingHistory ? (
            <div style={{ padding: "16px 4px", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
              <span className="loading-dots">...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "16px 4px", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
              {t("sidebar.empty_history")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {groupByDate(conversations).map(group => (
                <div key={group.label}>
                  <div style={{
                    padding: "10px 12px 4px", fontSize: 11, fontWeight: 600,
                    color: "var(--text-tertiary)", textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}>
                    {group.label}
                  </div>
                  {group.items.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      isActive={conv.id === activeConversationId}
                      onLoad={() => { onLoadConversation?.(conv.id); if (isMobile) onClose(); }}
                      onDelete={() => onDeleteConversation?.(conv.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid var(--border-secondary)", padding: 8 }}>
          {/* Settings */}
          <button onClick={handleSettings} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none", background: "none", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Settings size={16} /> <span>{t("sidebar.settings")}</span>
          </button>

          {/* User profile when logged in */}
          {isLoggedIn && displayName ? (
            <div style={{ marginTop: 4 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: "var(--radius-xs)",
              }}>
                {authUser?.avatar ? (
                  <img src={authUser.avatar} alt={displayName} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--bg-tertiary)", color: "var(--text-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 600, flexShrink: 0,
                  }}>
                    {userInitials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    Free plan
                  </div>
                </div>
              </div>
              {onSignOut && (
                <button onClick={() => { onSignOut(); if (isMobile) onClose(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none", background: "none", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left", marginTop: 2 }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <LogOut size={16} /> <span>{t("auth.sign_out")}</span>
                </button>
              )}
            </div>
          ) : !isLoggedIn ? (
            <button onClick={() => { window.location.href = "/login"; }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none", background: "none", borderRadius: "var(--radius-xs)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left", marginTop: 2 }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <LogIn size={16} /> <span>{t("auth.sign_in")}</span>
            </button>
          ) : null}
        </div>
      </>
    );
  }

  // ═══ COLLAPSED (icons only) ═══
  function renderCollapsedContent() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", paddingTop: 12 }}>
        {/* S logo — click to expand */}
        <button onClick={onOpen} title="Open sidebar" style={{
          width: iconBtnSize, height: iconBtnSize, display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "none", cursor: "pointer", borderRadius: "var(--radius-sm)",
          marginBottom: 8,
        }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <SignuxIcon variant="gold" size={28} />
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

        {/* User avatar or login icon */}
        {isLoggedIn ? (
          <div style={{ marginBottom: 10, cursor: "pointer" }} onClick={onOpen} title={displayName}>
            {authUser?.avatar ? (
              <img src={authUser.avatar} alt={displayName} width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                {userInitials}
              </div>
            )}
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
