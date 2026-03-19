"use client";
import { useRef, useEffect, useState } from "react";
import { SquarePen, MessageSquare, Zap, Search, Rocket, Globe, TrendingUp, Settings, LogIn, LogOut, Trash2, Flame } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";
import type { AuthUser } from "../lib/auth";
import type { Conversation } from "../lib/database-client";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import { updateStreak } from "../lib/streak";

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

const MODES: { key: Mode; icon: any; label: string; color?: string; tier?: "max" }[] = [
  { key: "chat", icon: MessageSquare, label: "sidebar.mode_chat" },
  { key: "simulate", icon: Zap, label: "sidebar.mode_simulate", color: "#D4AF37" },
  { key: "research", icon: Search, label: "sidebar.mode_research", color: "#6B8AFF" },
  { key: "launchpad", icon: Rocket, label: "sidebar.mode_launchpad", color: "#14B8A6" },
  { key: "globalops", icon: Globe, label: "sidebar.mode_globalops", color: "#22C55E", tier: "max" },
  { key: "invest", icon: TrendingUp, label: "sidebar.mode_invest", color: "#A855F7", tier: "max" },
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const title = conv.title || "New conversation";

  if (confirmDelete) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "8px 12px",
        borderRadius: "var(--radius-xs)",
        background: "rgba(239,68,68,0.05)",
        fontSize: 11, color: "var(--text-secondary)",
      }}>
        <span style={{ flex: 1 }}>Delete this chat?</span>
        <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--error)", fontSize: 11, fontWeight: 600, padding: "2px 6px",
        }}>Delete</button>
        <button onClick={() => setConfirmDelete(false)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-tertiary)", fontSize: 11, padding: "2px 6px",
        }}>Cancel</button>
      </div>
    );
  }

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
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
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

  /* ═══ Decision Follow-up Badge ═══ */
  const [pendingDecisions, setPendingDecisions] = useState(0);
  const userId = authUser?.id;

  useEffect(() => {
    if (!userId) { setPendingDecisions(0); return; }
    const checkDecisions = async () => {
      try {
        const supabase = createSupabaseBrowser();
        const { data } = await supabase
          .from("decision_journal")
          .select("id")
          .eq("user_id", userId)
          .is("outcome", null)
          .lte("follow_up_date", new Date().toISOString());
        setPendingDecisions(data?.length || 0);
      } catch {}
    };
    checkDecisions();
  }, [userId]);

  /* ═══ Streak Counter ═══ */
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const { streak: s } = updateStreak();
    setStreak(s);
  }, []);

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
          <button onClick={handleNew} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 14px", border: "1px solid var(--border-secondary)",
            borderRadius: "var(--radius-sm)", background: "transparent",
            cursor: "pointer", color: "var(--text-primary)", fontSize: 13,
            transition: "all 200ms ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.05)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-secondary)"; }}>
            <SquarePen size={16} />
            <span>{t("sidebar.new_chat")}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>⌘K</span>
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 8px 8px" }} />

        {/* Mode buttons */}
        <div style={{ padding: "0 8px 8px" }}>
          {MODES.map(({ key, icon: Icon, label, color, tier }, idx) => (
            <div key={key}>
              <button onClick={() => handleMode(key)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none",
                borderRadius: "var(--radius-xs)", cursor: "pointer", fontSize: 13, transition: "all 0.15s", textAlign: "left",
                background: mode === key ? "var(--bg-hover)" : "none",
                color: mode === key ? (color || "var(--text-primary)") : "var(--text-secondary)",
                fontWeight: mode === key ? 500 : 400,
              }} onMouseEnter={e => { if (mode !== key) e.currentTarget.style.background = "var(--bg-hover)"; }}
                 onMouseLeave={e => { if (mode !== key) e.currentTarget.style.background = "transparent"; }}>
                <Icon size={16} style={{ color: mode === key ? (color || "var(--accent)") : undefined }} />
                <span style={{ flex: 1 }}>{t(label)}</span>
                {tier === "max" && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                    color: color || "var(--text-tertiary)",
                    opacity: 0.6, textTransform: "uppercase",
                  }}>MAX</span>
                )}
              </button>
              {/* Divider after launchpad (index 3) */}
              {idx === 3 && (
                <div style={{ height: 1, width: "calc(100% - 16px)", background: "var(--border-secondary)", margin: "4px 8px" }} />
              )}
            </div>
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
            <div style={{ padding: "24px 4px", fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", fontStyle: "italic", opacity: 0.4 }}>
              <MessageSquare size={12} style={{ marginBottom: 4, display: "block", margin: "0 auto 6px" }} />
              Start a conversation
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
          {/* Streak counter */}
          {streak >= 2 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", margin: "4px 8px",
              fontSize: 11, color: "var(--text-tertiary)",
            }}>
              <Flame size={12} style={{
                color: streak >= 7 ? "#ef4444" : streak >= 3 ? "#f59e0b" : "var(--text-tertiary)",
              }} />
              <span>{streak}-day streak</span>
            </div>
          )}

          {/* Decision follow-up badge */}
          {pendingDecisions > 0 && (
            <a href="/decisions" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", margin: "4px 8px",
              borderRadius: 8, background: "rgba(168,85,247,0.06)",
              border: "1px solid rgba(168,85,247,0.12)",
              fontSize: 12, color: "var(--mode-inv, #A855F7)",
              textDecoration: "none", cursor: "pointer",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "#ef4444", color: "#fff",
                fontSize: 10, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {pendingDecisions}
              </div>
              <span>Decisions need follow-up</span>
            </a>
          )}

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
        {MODES.map(({ key, icon: Icon, label, color, tier }, idx) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button onClick={() => handleMode(key)} title={tier === "max" ? `${t(label)} (MAX)` : t(label)} style={{
              width: iconBtnSize, height: iconBtnSize, display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2,
              background: mode === key ? "var(--bg-hover)" : "none",
              color: mode === key ? (color || "var(--accent)") : "var(--text-tertiary)",
              opacity: tier === "max" && mode !== key ? 0.5 : 1,
              position: "relative",
            }} onMouseEnter={e => { if (mode !== key) e.currentTarget.style.background = "var(--bg-hover)"; }}
               onMouseLeave={e => { if (mode !== key) e.currentTarget.style.background = "transparent"; }}>
              <Icon size={iconSize} />
            </button>
            {/* Divider after launchpad (index 3) */}
            {idx === 3 && (
              <div style={{ height: 1, width: 24, background: "var(--border-secondary)", margin: "4px auto" }} />
            )}
          </div>
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
