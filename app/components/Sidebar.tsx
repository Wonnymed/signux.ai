"use client";
import { useRef, useEffect, useState } from "react";
import { MessageSquare, Zap, Shield, Rocket, Globe, TrendingUp, Settings, LogIn, LogOut, Trash2, FolderOpen, Plus, ChevronDown, X, Upload, LayoutDashboard } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";
import type { AuthUser } from "../lib/auth";
import type { Conversation } from "../lib/database-client";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import type { Project } from "../lib/useProjects";

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
  projects?: Project[];
  activeProject?: Project | null;
  onSelectProject?: (id: string | null) => void;
  onCreateProject?: (name: string) => void;
  onOpenKnowledge?: () => void;
  tier?: string;
  usage?: { simulations_month: number; researches_month: number; globalops_month: number; invest_month: number };
  limits?: { simulate_monthly: number; research_monthly: number; globalops_monthly: number; invest_monthly: number };
};

const MODES: { key: Mode; icon: any; label: string; color?: string }[] = [
  { key: "chat", icon: MessageSquare, label: "sidebar.mode_chat" },
  { key: "simulate", icon: Zap, label: "sidebar.mode_simulate", color: "#D4AF37" },
  { key: "intel", icon: Shield, label: "sidebar.mode_intel", color: "#DC2626" },
  { key: "launchpad", icon: Rocket, label: "sidebar.mode_launchpad", color: "#14B8A6" },
  { key: "globalops", icon: Globe, label: "sidebar.mode_globalops", color: "#22C55E" },
  { key: "invest", icon: TrendingUp, label: "sidebar.mode_invest", color: "#A855F7" },
];

/* ═══ Sidebar Icon Button with React Tooltip ═══ */
function SidebarIconButton({ icon, tooltip, active, activeColor, onClick, isPrimary, suppressTooltip, size = 40 }: {
  icon: React.ReactNode;
  tooltip: string;
  active?: boolean;
  activeColor?: string;
  onClick: () => void;
  isPrimary?: boolean;
  suppressTooltip?: boolean;
  size?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    setHovered(true);
    if (!suppressTooltip) {
      tooltipTimer.current = setTimeout(() => setShowTooltip(true), 350);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  };

  useEffect(() => {
    if (suppressTooltip) {
      setShowTooltip(false);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    }
  }, [suppressTooltip]);

  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  return (
    <div style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button onClick={onClick} style={{
        width: size,
        height: size,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        border: "none",
        padding: 0,
        background: active
          ? "rgba(212,175,55,0.12)"
          : hovered
          ? "rgba(255,255,255,0.06)"
          : "transparent",
        color: active
          ? (activeColor || "var(--accent)")
          : isPrimary
          ? (hovered ? "var(--accent)" : "var(--text-primary)")
          : hovered
          ? "var(--text-primary)"
          : "var(--text-tertiary)",
        transition: "all 150ms ease",
      }}>
        {icon}
      </button>

      {showTooltip && (
        <div style={{
          position: "absolute",
          left: "calc(100% + 12px)",
          top: "50%",
          transform: "translateY(-50%)",
          padding: "6px 12px",
          borderRadius: 8,
          background: "var(--card-bg, #252322)",
          border: "1px solid var(--border-secondary)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          whiteSpace: "nowrap",
          zIndex: 200,
          animation: "tooltipFadeIn 150ms ease-out forwards",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
            {tooltip}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══ Sidebar Logo Button — crossfade logo ↔ expand icon on hover ═══ */
function SidebarLogoButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    setHovered(true);
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 350);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  };

  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={onClick}
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "default",
          border: "none",
          padding: 0,
          position: "relative",
          background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
          transition: "background 150ms ease",
        }}
      >
        {/* Logo — visible when NOT hovered */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: hovered ? 0 : 1,
          transform: hovered ? "scale(0.85)" : "scale(1)",
          transition: "opacity 180ms ease, transform 180ms ease",
        }}>
          <SignuxIcon variant="gold" size={24} />
        </div>

        {/* Expand icon — visible when hovered */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: hovered ? 1 : 0,
          transform: hovered ? "scale(1)" : "scale(0.85)",
          transition: "opacity 180ms ease, transform 180ms ease",
          color: "var(--text-primary)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <polyline points="14 9 17 12 14 15" />
          </svg>
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div style={{
          position: "absolute",
          left: "calc(100% + 12px)",
          top: "50%",
          transform: "translateY(-50%)",
          padding: "6px 12px",
          borderRadius: 8,
          background: "var(--card-bg, #252322)",
          border: "1px solid var(--border-secondary)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          whiteSpace: "nowrap",
          zIndex: 200,
          animation: "tooltipFadeIn 150ms ease-out forwards",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
            Open sidebar
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══ Profile Popover — Dashboard, Settings, Sign out ═══ */
function ProfilePopover({ authUser, userInitials, displayName, tier, onOpenSettings, onSignOut, onClose }: {
  authUser?: AuthUser | null;
  userInitials: string;
  displayName: string;
  tier?: string;
  onOpenSettings: () => void;
  onSignOut?: () => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, color?: string) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 12px", border: "none",
        borderRadius: 8, background: "transparent",
        cursor: "pointer", color: color || "var(--text-secondary)",
        fontSize: 13, textAlign: "left",
        transition: "background 150ms",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        width: 220,
        padding: 6,
        borderRadius: 12,
        background: "var(--card-bg, #252322)",
        border: "1px solid var(--border-secondary)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        zIndex: 300,
        animation: "tooltipFadeIn 150ms ease-out forwards",
      }}
    >
      {/* User info header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px 8px",
      }}>
        {authUser?.avatar ? (
          <img src={authUser.avatar} alt={displayName} width={32} height={32}
            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--bg-tertiary)", color: "var(--text-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 600, flexShrink: 0,
          }}>
            {userInitials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {tier === "max" || tier === "founding" ? (
              <span style={{ color: "#A855F7" }}>Max plan</span>
            ) : tier === "pro" ? (
              <span style={{ color: "#D4AF37" }}>Pro plan</span>
            ) : (
              "Free plan"
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border-secondary)", margin: "4px 8px" }} />

      {/* Menu items */}
      {menuItem(<LayoutDashboard size={15} strokeWidth={1.5} />, "Dashboard", () => { window.location.href = "/dashboard"; })}
      {menuItem(<Settings size={15} strokeWidth={1.5} />, "Settings", onOpenSettings)}

      {onSignOut && (
        <>
          <div style={{ height: 1, background: "var(--border-secondary)", margin: "4px 8px" }} />
          {menuItem(<LogOut size={15} strokeWidth={1.5} />, "Sign out", onSignOut, "var(--text-tertiary)")}
        </>
      )}
    </div>
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
  const title = conv.title || "New chat";

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
            width: 28, height: 28, borderRadius: "var(--radius-xs)",
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
  projects = [], activeProject, onSelectProject, onCreateProject, onOpenKnowledge,
  tier, usage, limits,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : (authUser?.initials || "?");
  const displayName = profileName || authUser?.name || "";

  const handleMode = (m: Mode) => { setMode(m); if (open) onClose(); };
  const handleNew = () => { onNewConversation(); if (open) onClose(); };
  const toggleSidebar = () => { if (open) onClose(); else onOpen(); };

  /* ═══ Project Selector State ═══ */
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
        setShowNewProjectInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projectDropdownOpen]);

  /* ═══ Profile Popover State ═══ */
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);

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

  // Click outside to close (mobile + desktop expanded)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Escape to close sidebar
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const iconSize = 18;
  const iconSW = 1.5;

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 199 }} />}
        <aside ref={sidebarRef} style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 200,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms ease",
          background: "var(--bg-sidebar)", borderRight: "1px solid var(--sidebar-border)",
          display: "flex", flexDirection: "column",
        }}>
          {renderExpandedContent()}
        </aside>
      </>
    );
  }

  // Desktop: single sidebar, collapsed 56px / expanded 260px
  const sidebarWidth = open ? 260 : 56;

  return (
    <aside ref={sidebarRef} style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      flexShrink: 0,
      background: "var(--bg-sidebar)",
      borderRight: "1px solid var(--sidebar-border)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      transition: "width 200ms ease, min-width 200ms ease",
    }}>
      {open ? renderExpandedContent() : renderCollapsedContent()}
    </aside>
  );

  // ═══ EXPANDED ═══
  function renderExpandedContent() {
    return (
      <>
        {/* Header */}
        <div style={{ padding: "12px 12px 12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SignuxIcon variant="gold" size={24} />
            <span style={{ fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "var(--text-primary)" }}>
              SIGNUX <span style={{ fontWeight: 300, opacity: 0.4 }}>AI</span>
            </span>
          </div>
          <button onClick={onClose} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, border: "none", background: "transparent",
            cursor: "pointer", borderRadius: 6,
            color: "var(--text-tertiary)", transition: "color 150ms",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}>
            <X size={14} />
          </button>
        </div>

        {/* New chat */}
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
            <Plus size={16} strokeWidth={2} />
            <span>New chat</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>⌘K</span>
          </button>
        </div>

        {/* Projects selector */}
        {isLoggedIn && (
          <div style={{ padding: "0 8px 8px", position: "relative" }} ref={projectDropdownRef}>
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 12px", border: "1px solid var(--border-secondary)",
                borderRadius: "var(--radius-xs)", background: "transparent",
                cursor: "pointer", color: "var(--text-secondary)", fontSize: 12,
                transition: "all 150ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)"; }}
              onMouseLeave={e => { if (!projectDropdownOpen) e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
            >
              <FolderOpen size={14} style={{ color: activeProject?.color || "var(--text-tertiary)", flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
                {activeProject ? activeProject.name : "Projects"}
              </span>
              <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5, transform: projectDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
            </button>

            {projectDropdownOpen && (
              <div style={{
                position: "absolute", top: "100%", left: 8, right: 8,
                background: "var(--bg-secondary, #141414)", border: "1px solid var(--border-secondary)",
                borderRadius: "var(--radius-sm)", zIndex: 100,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                maxHeight: 280, overflowY: "auto",
              }}>
                <button
                  onClick={() => { onSelectProject?.(null); setProjectDropdownOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 12px", border: "none", background: !activeProject ? "var(--bg-hover)" : "transparent",
                    cursor: "pointer", color: "var(--text-secondary)", fontSize: 12, textAlign: "left",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={e => { if (activeProject) e.currentTarget.style.background = "transparent"; }}
                >
                  <MessageSquare size={13} style={{ opacity: 0.5 }} />
                  <span>All chats</span>
                </button>

                {projects.length > 0 && (
                  <div style={{ height: 1, background: "var(--border-secondary)", margin: "2px 0" }} />
                )}

                {projects.filter(p => !p.archived).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onSelectProject?.(p.id); setProjectDropdownOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "8px 12px", border: "none",
                      background: p.id === activeProject?.id ? "var(--bg-hover)" : "transparent",
                      cursor: "pointer", color: "var(--text-secondary)", fontSize: 12, textAlign: "left",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => { if (p.id !== activeProject?.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || "#D4AF37", flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    {p.conversation_count > 0 && (
                      <span style={{ fontSize: 10, opacity: 0.4 }}>{p.conversation_count}</span>
                    )}
                  </button>
                ))}

                <div style={{ height: 1, background: "var(--border-secondary)", margin: "2px 0" }} />

                {showNewProjectInput ? (
                  <div style={{ padding: "8px 12px", display: "flex", gap: 6 }}>
                    <input
                      autoFocus
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newProjectName.trim()) {
                          onCreateProject?.(newProjectName.trim());
                          setNewProjectName("");
                          setShowNewProjectInput(false);
                          setProjectDropdownOpen(false);
                        } else if (e.key === "Escape") {
                          setShowNewProjectInput(false);
                          setNewProjectName("");
                        }
                      }}
                      placeholder="Project name..."
                      style={{
                        flex: 1, padding: "4px 8px", fontSize: 12,
                        background: "var(--bg-primary)", border: "1px solid var(--border-secondary)",
                        borderRadius: 4, color: "var(--text-primary)", outline: "none",
                      }}
                    />
                    <button
                      onClick={() => { setShowNewProjectInput(false); setNewProjectName(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 2 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewProjectInput(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "8px 12px", border: "none", background: "transparent",
                      cursor: "pointer", color: "var(--accent)", fontSize: 12, textAlign: "left",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Plus size={13} />
                    <span>New project</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 8px 8px" }} />

        {/* Mode buttons */}
        <div style={{ padding: "0 8px 8px" }}>
          {MODES.map(({ key, icon: Icon, label, color }, idx) => (
            <div key={key}>
              <button onClick={() => handleMode(key)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none",
                borderRadius: "var(--radius-xs)", cursor: "pointer", fontSize: 13, transition: "all 0.15s", textAlign: "left",
                background: mode === key ? "var(--bg-hover)" : "none",
                color: mode === key ? (color || "var(--text-primary)") : "var(--text-secondary)",
                fontWeight: mode === key ? 500 : 400,
              }} onMouseEnter={e => { if (mode !== key) e.currentTarget.style.background = "var(--bg-hover)"; }}
                 onMouseLeave={e => { if (mode !== key) e.currentTarget.style.background = "transparent"; }}>
                <Icon size={16} strokeWidth={1.5} style={{ color: mode === key ? (color || "var(--accent)") : undefined }} />
                <span style={{ flex: 1 }}>{t(label)}</span>
              </button>
              {idx === 3 && (
                <div style={{ height: 1, width: "calc(100% - 16px)", background: "var(--border-secondary)", margin: "4px 8px" }} />
              )}
            </div>
          ))}
        </div>

        {/* Usage counters for Pro users */}
        {tier === "pro" && usage && limits && (
          <div style={{ padding: "0 8px 8px" }}>
            <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
              Usage this month
            </div>
            {[
              { label: "Simulations", used: usage.simulations_month, total: limits.simulate_monthly, color: "#D4AF37" },
              { label: "Research", used: usage.researches_month, total: limits.research_monthly, color: "#DC2626" },
              { label: "Global Ops", used: usage.globalops_month, total: limits.globalops_monthly, color: "#22C55E" },
              { label: "Invest", used: usage.invest_month, total: limits.invest_monthly, color: "#A855F7" },
            ].filter(u => u.total > 0 && u.total < Infinity).map(u => (
              <div key={u.label} style={{ padding: "3px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{u.label}</span>
                  <span style={{ color: u.used >= u.total ? "#ef4444" : "var(--text-tertiary)" }}>{u.used}/{u.total}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "var(--border-secondary)" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${Math.min((u.used / u.total) * 100, 100)}%`,
                    background: u.used >= u.total ? "#ef4444" : u.color,
                    transition: "width 300ms ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 8px 8px" }} />

        {/* History area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {activeProject && (
            <div style={{
              padding: "6px 12px", fontSize: 10, fontWeight: 600,
              color: activeProject.color || "var(--accent)",
              textTransform: "uppercase", letterSpacing: 1, opacity: 0.7,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ flex: 1 }}>{activeProject.name}</span>
              {onOpenKnowledge && (
                <button
                  onClick={onOpenKnowledge}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: activeProject.color || "var(--accent)", padding: 2,
                    opacity: 0.7, transition: "opacity 150ms",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                >
                  <Upload size={11} />
                </button>
              )}
            </div>
          )}
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
                      onLoad={() => { onLoadConversation?.(conv.id); onClose(); }}
                      onDelete={() => onDeleteConversation?.(conv.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom — profile only */}
        <div style={{ borderTop: "1px solid var(--border-secondary)", padding: 8, position: "relative" }}>
          {/* Decision follow-up badge */}
          {pendingDecisions > 0 && (
            <a href="/decisions" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", margin: "0 0 4px",
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

          {/* Profile row — click opens popover */}
          {isLoggedIn && displayName ? (
            <div style={{ position: "relative" }}>
              {profilePopoverOpen && (
                <ProfilePopover
                  authUser={authUser}
                  userInitials={userInitials}
                  displayName={displayName}
                  tier={tier}
                  onOpenSettings={() => { onOpenSettings(); onClose(); }}
                  onSignOut={onSignOut ? () => { onSignOut(); onClose(); } : undefined}
                  onClose={() => setProfilePopoverOpen(false)}
                />
              )}
              <button
                onClick={() => setProfilePopoverOpen(!profilePopoverOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 10px", border: "none",
                  borderRadius: 8, background: profilePopoverOpen ? "rgba(255,255,255,0.04)" : "transparent",
                  cursor: "pointer", transition: "background 150ms",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => { if (!profilePopoverOpen) e.currentTarget.style.background = "transparent"; }}
              >
                {authUser?.avatar ? (
                  <img src={authUser.avatar} alt={displayName} width={28} height={28}
                    style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "var(--bg-tertiary)", color: "var(--text-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>
                    {userInitials}
                  </div>
                )}
                <span style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                  {displayName}
                </span>
              </button>
            </div>
          ) : !isLoggedIn ? (
            <button onClick={() => { window.location.href = "/login"; }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 10px", border: "none", background: "transparent",
              borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <LogIn size={16} strokeWidth={1.5} />
              <span>{t("auth.sign_in")}</span>
            </button>
          ) : null}
        </div>
      </>
    );
  }

  // ═══ COLLAPSED ═══
  function renderCollapsedContent() {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        padding: "16px 0",
      }}>
        {/* Logo — hover swaps to expand icon, click opens sidebar */}
        <SidebarLogoButton onClick={toggleSidebar} />

        <div style={{ height: 16 }} />

        {/* New chat */}
        <SidebarIconButton
          icon={<Plus size={iconSize} strokeWidth={2} />}
          tooltip="New chat"
          onClick={handleNew}
          isPrimary
        />

        {/* Separator */}
        <div style={{ width: 24, height: 1, background: "var(--border-secondary)", margin: "8px 0", opacity: 0.5 }} />

        {/* Mode buttons */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          flex: 1,
        }}>
          {MODES.map(({ key, icon: Icon, label, color }, idx) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <SidebarIconButton
                icon={<Icon size={iconSize} strokeWidth={iconSW} />}
                tooltip={t(label)}
                active={mode === key}
                activeColor={color || "var(--accent)"}
                onClick={() => handleMode(key)}
              />
              {idx === 3 && (
                <div style={{ width: 24, height: 1, background: "var(--border-secondary)", margin: "6px 0", opacity: 0.5 }} />
              )}
            </div>
          ))}
        </div>

        {/* Separator */}
        <div style={{ width: 24, height: 1, background: "var(--border-secondary)", margin: "8px 0", opacity: 0.5 }} />

        {/* Bottom — avatar only */}
        <div style={{ position: "relative" }}>
          {/* Profile popover for collapsed state */}
          {profilePopoverOpen && isLoggedIn && (
            <ProfilePopover
              authUser={authUser}
              userInitials={userInitials}
              displayName={displayName}
              tier={tier}
              onOpenSettings={onOpenSettings}
              onSignOut={onSignOut}
              onClose={() => setProfilePopoverOpen(false)}
            />
          )}
          {isLoggedIn ? (
            <SidebarIconButton
              icon={
                authUser?.avatar ? (
                  <img src={authUser.avatar} alt={displayName} width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} referrerPolicy="no-referrer" />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
                    {userInitials}
                  </div>
                )
              }
              tooltip={displayName || "Profile"}
              onClick={() => setProfilePopoverOpen(!profilePopoverOpen)}
            />
          ) : (
            <SidebarIconButton
              icon={<LogIn size={iconSize} strokeWidth={iconSW} />}
              tooltip={t("auth.sign_in")}
              onClick={() => { window.location.href = "/login"; }}
            />
          )}
        </div>
      </div>
    );
  }
}
