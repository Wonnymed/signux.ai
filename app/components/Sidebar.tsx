"use client";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare, Zap, Swords, Hammer, TrendingUp, UserCheck, Shield,
  Settings, LogIn, LogOut, Trash2, FolderOpen, Plus, ChevronDown,
  X, Upload, LayoutDashboard, PanelLeft, Crown, Monitor, Sun, Moon,
  BookOpen,
} from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";
import { ENGINES, type EngineId } from "../lib/engines";
import { useTheme, type Theme } from "../lib/useTheme";
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
  usage?: { simulations_month: number; researches_month: number; protect_month: number; hire_month: number };
  limits?: { simulate_monthly: number; research_monthly: number; protect_monthly: number; hire_monthly: number };
  savedSimulations?: any[];
  onLoadSimulation?: (id: string) => void;
  tokenStatus?: { available: number; monthlyTotal: number; plan: string };
};

const ICON_IDLE = "#52525B";
const ICON_ACTIVE = "#EDEDEF";

const ICON_MAP: Record<string, any> = {
  Zap, Hammer, TrendingUp, UserCheck, Shield, Swords,
};

/* 6 engines only — no "chat" mode. Engines are categories. */
const ENGINE_MODES: { key: Mode; icon: any; name: string; subtitle: string }[] =
  (Object.keys(ENGINES) as EngineId[]).map((id) => ({
    key: id as Mode,
    icon: ICON_MAP[ENGINES[id].icon] || Zap,
    name: ENGINES[id].name,
    subtitle: ENGINES[id].subtitle,
  }));

/* ═══ Portal-based Sidebar Tooltip — renders in <body>, outside overflow:hidden ═══ */
function SidebarTooltip({ show, text, anchorRef }: {
  show: boolean;
  text: string;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (show) {
      timer.current = setTimeout(() => {
        if (anchorRef.current) {
          const rect = anchorRef.current.getBoundingClientRect();
          setPos({
            top: rect.top + rect.height / 2,
            left: rect.right + 12,
          });
        }
        setVisible(true);
      }, 350);
    } else {
      setVisible(false);
      if (timer.current) clearTimeout(timer.current);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [show, anchorRef]);

  if (!visible || !mounted) return null;

  return createPortal(
    <div style={{
      position: "fixed",
      top: pos.top,
      left: pos.left,
      transform: "translateY(-50%)",
      padding: "6px 12px",
      borderRadius: 8,
      background: "var(--bg-card)",
      border: "1px solid var(--border-secondary)",
      boxShadow: "var(--shadow-md)",
      whiteSpace: "nowrap",
      zIndex: 10000,
      pointerEvents: "none",
      animation: "tooltipFadeIn 150ms ease-out forwards",
    }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
        {text}
      </span>
    </div>,
    document.body,
  );
}

/* ═══ Sidebar Icon Button with Portal Tooltip ═══ */
function SidebarIconButton({ icon, tooltip, active, activeColor, modeColor, onClick, isPrimary, suppressTooltip, size = 40 }: {
  icon: React.ReactNode;
  tooltip: string;
  active?: boolean;
  activeColor?: string;
  modeColor?: string;
  onClick: () => void;
  isPrimary?: boolean;
  suppressTooltip?: boolean;
  size?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  // Neutral scheme: idle=#6B6B6B, hover=lighter, active=white
  const iconColor = active
    ? ICON_ACTIVE
    : isPrimary
      ? (hovered ? "var(--text-primary)" : "var(--text-secondary)")
      : hovered
        ? "#9A9A9A"
        : (modeColor || "var(--text-tertiary)");

  const bgColor = active
    ? "var(--bg-hover)"
    : hovered
      ? "var(--bg-hover)"
      : "transparent";

  return (
    <div
      ref={btnRef}
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
        padding: 0,
        background: bgColor,
        color: iconColor,
        transition: "all 150ms ease",
      }}>
        {icon}
      </button>

      {!suppressTooltip && <SidebarTooltip show={hovered} text={tooltip} anchorRef={btnRef} />}
    </div>
  );
}

/* ═══ Profile Popover — Portal-based, renders in <body> ═══ */
function ProfilePopover({
  anchorRef, isOpen, onClose, authUser, userInitials, displayName,
  tier, onOpenSettings, onSignOut, sidebarWidth,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  authUser?: AuthUser | null;
  userInitials: string;
  displayName: string;
  tier?: string;
  onOpenSettings: () => void;
  onSignOut?: () => void;
  sidebarWidth: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean) => (
    <button
      key={label}
      onClick={() => { onClick(); onClose(); }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "9px 10px", borderRadius: 8,
        background: "transparent", border: "none",
        cursor: "pointer", textAlign: "left",
        color: danger ? "#EF4444" : "var(--text-primary)",
        fontSize: 13, fontWeight: 400,
        transition: "background 150ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? "rgba(239,68,68,0.06)" : "var(--bg-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      {icon}
      {label}
    </button>
  );

  return createPortal(
    <>
      {/* Invisible backdrop to close on click outside */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "transparent" }}
      />

      {/* Popover */}
      <div style={{
        position: "fixed",
        bottom: 16,
        left: sidebarWidth + 12,
        zIndex: 9999,
        width: 240,
        padding: 8,
        borderRadius: 14,
        background: "var(--card-bg, #141418)",
        border: "1px solid var(--border-secondary)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        animation: "profilePopoverIn 150ms ease-out",
      }}>
        {/* User info */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 8px",
          borderBottom: "1px solid var(--border-secondary)",
          marginBottom: 4,
        }}>
          {authUser?.avatar ? (
            <img src={authUser.avatar} alt={displayName} width={36} height={36}
              style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
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
                <span style={{ color: "var(--text-primary)" }}>Pro plan</span>
              ) : (
                "Free plan"
              )}
            </div>
          </div>
        </div>

        {/* Menu items */}
        {menuItem(<LayoutDashboard size={15} strokeWidth={1.5} />, "Dashboard", () => { window.location.href = "/dashboard"; })}
        {menuItem(<Settings size={15} strokeWidth={1.5} />, "Settings", onOpenSettings)}

        {onSignOut && (
          <>
            <div style={{ height: 1, background: "var(--border-secondary)", margin: "4px 8px" }} />
            {menuItem(<LogOut size={15} strokeWidth={1.5} />, "Sign out", onSignOut, true)}
          </>
        )}
      </div>
    </>,
    document.body,
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

/* ═══ Skeleton Loader ═══ */
function HistorySkeleton() {
  return (
    <div style={{ padding: "8px" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 38, borderRadius: 8, marginBottom: 4,
          background: "rgba(255,255,255,0.02)",
          animation: "skeletonPulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

/* ═══ MAIN SIDEBAR COMPONENT ═══ */
export default function Sidebar({
  mode, setMode, profileName, onNewConversation, onOpenSettings,
  open, onClose, onOpen, isLoggedIn, onSignOut, isMobile, authUser,
  conversations, loadingHistory = false, activeConversationId, onLoadConversation, onDeleteConversation,
  projects = [], activeProject, onSelectProject, onCreateProject, onOpenKnowledge,
  tier, usage, limits, savedSimulations = [], onLoadSimulation, tokenStatus,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const sidebarRef = useRef<HTMLElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const avatarCollapsedRef = useRef<HTMLButtonElement>(null);
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : (authUser?.initials || "?");
  const displayName = profileName || authUser?.name || "";

  // Navigate to /chat with mode as query param if on a different route
  const handleMode = (m: Mode) => {
    if (pathname !== "/chat") {
      router.push(`/chat?mode=${m}`);
    } else {
      setMode(m);
    }
    if (open) onClose();
  };
  const handleNew = () => {
    if (pathname !== "/chat") {
      router.push("/chat");
    }
    onNewConversation();
    if (open) onClose();
  };

  /* ═══ Profile Popover State ═══ */
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);

  /* ═══ Close sidebar button hover state ═══ */
  const [closeHovered, setCloseHovered] = useState(false);

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

  // Escape to close sidebar
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close profile popover when sidebar state changes
  useEffect(() => { setProfilePopoverOpen(false); }, [open]);

  const iconSize = 20;
  const iconSW = 1.5;
  const sidebarWidth = open ? 260 : 56;

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 199 }} />}
        <aside ref={sidebarRef} style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 200,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms ease",
          background: "var(--bg-primary)", borderRight: "1px solid var(--border-primary)",
          display: "flex", flexDirection: "column",
        }}>
          {renderExpandedContent()}
        </aside>

        {/* Profile popover — portal */}
        <ProfilePopover
          anchorRef={avatarRef}
          isOpen={profilePopoverOpen}
          onClose={() => setProfilePopoverOpen(false)}
          authUser={authUser}
          userInitials={userInitials}
          displayName={displayName}
          tier={tier}
          onOpenSettings={() => { onOpenSettings(); onClose(); }}
          onSignOut={onSignOut ? () => { onSignOut(); onClose(); } : undefined}
          sidebarWidth={280}
        />
      </>
    );
  }

  // Desktop: single sidebar, collapsed 56px / expanded 260px
  return (
    <>
      {/* BUG 10 FIX: Backdrop when sidebar is expanded — clicking outside closes it */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 44,
            background: "rgba(0,0,0,0.15)",
          }}
        />
      )}

      <aside ref={sidebarRef} style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: sidebarWidth,
        zIndex: 45,
        background: "var(--bg-primary)",
        borderRight: "1px solid var(--border-primary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 200ms ease",
      }}>
        {open ? renderExpandedContent() : renderCollapsedContent()}
      </aside>

      {/* Profile popover — portal, outside sidebar clipping */}
      <ProfilePopover
        anchorRef={open ? avatarRef : avatarCollapsedRef}
        isOpen={profilePopoverOpen}
        onClose={() => setProfilePopoverOpen(false)}
        authUser={authUser}
        userInitials={userInitials}
        displayName={displayName}
        tier={tier}
        onOpenSettings={() => { onOpenSettings(); if (open) onClose(); }}
        onSignOut={onSignOut ? () => { onSignOut(); if (open) onClose(); } : undefined}
        sidebarWidth={sidebarWidth}
      />
    </>
  );

  // ═══ EXPANDED ═══
  function renderExpandedContent() {
    const convList = conversations;
    const isLoading = loadingHistory || convList === undefined;
    const showUpgrade = tier !== "pro" && tier !== "max" && tier !== "founding";
    const [historyOpen, setHistoryOpen] = useState(false);
    const [hoveredMode, setHoveredMode] = useState<string | null>(null);

    return (
      <>
        {/* Header — logo left, close right */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 12px 12px 16px", height: 56,
          borderBottom: "1px solid var(--border-secondary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SignuxIcon variant="gold" size={20} />
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700,
              letterSpacing: 2.5, color: "var(--text-primary)",
            }}>
              SIGNUX
            </span>
          </div>
          <CloseButtonWithTooltip hovered={closeHovered} setHovered={setCloseHovered} onClick={onClose} />
        </div>

        {/* ═══ MAIN ZONE — 6 engines ═══ */}
        <div style={{ padding: "8px 8px 4px" }}>
          {ENGINE_MODES.map(({ key, icon: Icon, name, subtitle }) => {
            const isActive = mode === key;
            const isHovered = hoveredMode === key;
            return (
              <button
                key={key}
                onClick={() => handleMode(key)}
                onMouseEnter={() => setHoveredMode(key)}
                onMouseLeave={() => setHoveredMode(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "9px 12px",
                  border: "none",
                  borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer", fontSize: 13, textAlign: "left",
                  background: isActive ? "var(--bg-hover)" : isHovered ? "var(--bg-hover)" : "transparent",
                  color: isActive ? ICON_ACTIVE : ICON_IDLE,
                  fontWeight: isActive ? 500 : 400,
                  transition: "all 150ms",
                  marginBottom: 1,
                }}
              >
                <Icon size={16} strokeWidth={1.5} style={{ color: isActive ? ICON_ACTIVE : ICON_IDLE, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: isActive ? ICON_ACTIVE : isHovered ? "var(--text-secondary)" : ICON_IDLE }}>
                    {name}
                  </span>
                  {/* Subtitle on hover only */}
                  {isHovered && !isActive && (
                    <div style={{
                      fontSize: 11, color: "var(--text-tertiary)",
                      marginTop: 1, lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {subtitle}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ═══ DIVIDER ═══ */}
        <div style={{ height: 1, background: "var(--border-secondary)", margin: "4px 12px 4px" }} />

        {/* ═══ UTILITY ZONE ═══ */}
        <div style={{ padding: "4px 8px" }}>
          {/* Saved / History */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "8px 12px", border: "none",
              borderRadius: "var(--radius-xs)", cursor: "pointer",
              fontSize: 13, textAlign: "left", background: "transparent",
              color: ICON_IDLE, fontWeight: 400, transition: "all 150ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ICON_IDLE; }}
          >
            <BookOpen size={16} strokeWidth={1.5} />
            <span style={{ flex: 1 }}>Saved</span>
            <ChevronDown size={12} style={{ opacity: 0.4, transform: historyOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms" }} />
          </button>

          {/* Settings */}
          <button
            onClick={() => { onOpenSettings(); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "8px 12px", border: "none",
              borderRadius: "var(--radius-xs)", cursor: "pointer",
              fontSize: 13, textAlign: "left", background: "transparent",
              color: ICON_IDLE, fontWeight: 400, transition: "all 150ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ICON_IDLE; }}
          >
            <Settings size={16} strokeWidth={1.5} />
            <span style={{ flex: 1 }}>Settings</span>
          </button>
        </div>

        {/* Theme toggle */}
        <div style={{ padding: "2px 12px 4px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 2,
            padding: 2, borderRadius: 8,
            background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
          }}>
            {([
              { value: "auto" as Theme, icon: Monitor, tip: "Auto" },
              { value: "light" as Theme, icon: Sun, tip: "Light" },
              { value: "dark" as Theme, icon: Moon, tip: "Dark" },
            ]).map(({ value, icon: ThIcon, tip }) => {
              const active = theme === value;
              return (
                <button key={value} title={tip} onClick={() => setTheme(value)} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "5px 0", border: "none", borderRadius: 6, cursor: "pointer",
                  background: active ? "var(--bg-hover)" : "transparent",
                  color: active ? ICON_ACTIVE : ICON_IDLE,
                  transition: "all 150ms",
                }}>
                  <ThIcon size={14} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Token counter */}
        {tokenStatus && (
          <div style={{ padding: "2px 12px 4px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
              color: tokenStatus.available <= 0 ? "#F75B5B" : ICON_IDLE,
            }}>
              {tokenStatus.available >= 1000 ? `${(tokenStatus.available / 1000).toFixed(0)}K` : tokenStatus.available} ST
            </span>
            {showUpgrade && (
              <span
                onClick={() => router.push("/pricing")}
                style={{ fontSize: 10, color: "var(--text-tertiary)", cursor: "pointer", marginLeft: "auto" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
              >
                Upgrade
              </span>
            )}
          </div>
        )}

        {/* ═══ HISTORY AREA (expandable) ═══ */}
        {historyOpen && (
          <>
            <div style={{ height: 1, background: "var(--border-secondary)", margin: "4px 12px" }} />
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px", minHeight: 100 }}>
              {activeProject && (
                <div style={{
                  padding: "6px 12px", fontSize: 10, fontWeight: 600,
                  color: activeProject.color || "var(--accent)",
                  textTransform: "uppercase", letterSpacing: 1, opacity: 0.7,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ flex: 1 }}>{activeProject.name}</span>
                  {onOpenKnowledge && (
                    <button onClick={onOpenKnowledge} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: activeProject.color || "var(--accent)", padding: 2, opacity: 0.7,
                    }}>
                      <Upload size={11} />
                    </button>
                  )}
                </div>
              )}
              {isLoading ? (
                <HistorySkeleton />
              ) : convList && convList.length === 0 ? (
                <div style={{ padding: "16px 4px", fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", opacity: 0.4 }}>
                  No saved conversations yet
                </div>
              ) : convList ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {groupByDate(convList).map(group => (
                    <div key={group.label}>
                      <div style={{
                        padding: "10px 12px 4px", fontSize: 11, fontWeight: 600,
                        color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.8,
                      }}>
                        {group.label}
                      </div>
                      {group.items.map(conv => (
                        <ConversationItem
                          key={conv.id} conv={conv}
                          isActive={conv.id === activeConversationId}
                          onLoad={() => { onLoadConversation?.(conv.id); onClose(); }}
                          onDelete={() => onDeleteConversation?.(conv.id)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Saved Simulations */}
              {savedSimulations.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border-secondary)", marginTop: 4, paddingTop: 4 }}>
                  <div style={{
                    padding: "6px 12px", fontSize: 10, fontWeight: 600,
                    color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 1,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Zap size={10} /> Saved Simulations
                  </div>
                  <div style={{ maxHeight: 140, overflowY: "auto" }}>
                    {savedSimulations.slice(0, 10).map((sim: any) => (
                      <div key={sim.id}
                        onClick={() => { onLoadSimulation?.(sim.id); onClose(); }}
                        style={{
                          padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                          transition: "background 150ms", fontSize: 12, color: "var(--text-secondary)",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontWeight: 500, color: "var(--text-primary)", marginBottom: 2,
                        }}>
                          {sim.scenario?.slice(0, 60) || "Untitled"}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)", display: "flex", gap: 8 }}>
                          <span>{new Date(sim.created_at).toLocaleDateString()}</span>
                          {sim.verdict?.viability != null && (
                            <span style={{ color: "var(--text-secondary)" }}>{sim.verdict.viability}/10</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Spacer when history is closed */}
        {!historyOpen && <div style={{ flex: 1 }} />}

        {/* ═══ BOTTOM — avatar + plan badge ═══ */}
        <div style={{ borderTop: "1px solid var(--border-secondary)", padding: 8 }}>
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

          {/* Profile row + plan badge */}
          {isLoggedIn && displayName ? (
            <button
              ref={avatarRef}
              onClick={() => setProfilePopoverOpen(!profilePopoverOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 10px", border: "none",
                borderRadius: 8, background: profilePopoverOpen ? "var(--bg-hover)" : "transparent",
                cursor: "pointer", transition: "background 150ms",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => { if (!profilePopoverOpen) e.currentTarget.style.background = "transparent"; }}
            >
              {authUser?.avatar ? (
                <img src={authUser.avatar} alt={displayName} width={28} height={28}
                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--bg-hover)", border: "1px solid var(--border-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, color: "var(--text-primary)",
                }}>
                  {userInitials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {displayName}
                </div>
              </div>
              {/* Plan badge tiny */}
              <span style={{
                fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 600,
                padding: "2px 6px", borderRadius: 50, letterSpacing: 0.5,
                background: tier === "max" || tier === "founding" ? "rgba(168,85,247,0.08)" :
                            tier === "pro" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                color: tier === "max" || tier === "founding" ? "#A855F7" :
                       tier === "pro" ? "var(--text-secondary)" : "var(--text-tertiary)",
              }}>
                {tier === "max" || tier === "founding" ? "MAX" : tier === "pro" ? "PRO" : "FREE"}
              </span>
            </button>
          ) : !isLoggedIn ? (
            <button onClick={() => { window.location.href = "/login"; }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 10px", border: "none", background: "transparent",
              borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
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
        display: "flex", flexDirection: "column", alignItems: "center",
        height: "100%", padding: "16px 0",
      }}>
        {/* Logo */}
        <CollapsedLogoButton onClick={onOpen} />

        <div style={{ height: 12 }} />

        {/* ═══ MAIN ZONE — 6 engine icons ═══ */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {ENGINE_MODES.map(({ key, icon: Icon, name }) => (
            <SidebarIconButton
              key={key}
              icon={<Icon size={iconSize} strokeWidth={iconSW} />}
              tooltip={name}
              active={mode === key}
              modeColor={ICON_IDLE}
              onClick={() => handleMode(key)}
            />
          ))}
        </div>

        {/* ═══ DIVIDER ═══ */}
        <div style={{ width: 24, height: 1, background: "var(--border-secondary)", margin: "8px 0", opacity: 0.5 }} />

        {/* ═══ UTILITY — history + settings ═══ */}
        <SidebarIconButton
          icon={<BookOpen size={iconSize} strokeWidth={iconSW} />}
          tooltip="Saved"
          modeColor={ICON_IDLE}
          onClick={onOpen}
        />
        <SidebarIconButton
          icon={<Settings size={iconSize} strokeWidth={iconSW} />}
          tooltip="Settings"
          modeColor={ICON_IDLE}
          onClick={() => onOpenSettings()}
        />

        <div style={{ flex: 1 }} />

        {/* ═══ BOTTOM — avatar ═══ */}
        {isLoggedIn ? (
          <SidebarIconButton
            icon={
              authUser?.avatar ? (
                <img src={authUser.avatar} alt={displayName} width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} referrerPolicy="no-referrer" />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--bg-hover)", border: "1px solid var(--border-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, color: "var(--text-primary)",
                }}>
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
    );
  }
}

/* ═══ Close Button with Portal Tooltip ═══ */
function CloseButtonWithTooltip({ hovered, setHovered, onClick }: {
  hovered: boolean;
  setHovered: (v: boolean) => void;
  onClick: () => void;
}) {
  const btnRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={btnRef}
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          width: 32, height: 32, borderRadius: 6,
          border: "none", padding: 0,
          background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          color: hovered ? "var(--text-primary)" : "var(--text-tertiary)",
          transition: "all 150ms ease",
        }}
      >
        <PanelLeft size={16} strokeWidth={1.5} />
      </button>

      <SidebarTooltip show={hovered} text="Close Sidebar" anchorRef={btnRef} />
    </div>
  );
}

/* ═══ Collapsed Logo Button — logo substitutes to PanelLeft on hover ═══ */
function CollapsedLogoButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={btnRef}
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
          cursor: "pointer",
          border: "none",
          padding: 0,
          background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
          transition: "background 150ms ease",
        }}
      >
        {/* Container for cross-fade substitution */}
        <div style={{ position: "relative", width: 24, height: 24 }}>
          {/* Logo — visible when NOT hovered */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hovered ? 0 : 1,
            transition: "opacity 200ms ease",
          }}>
            <SignuxIcon variant="gold" size={24} />
          </div>

          {/* PanelLeft — visible when hovered */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 200ms ease",
            color: "var(--text-primary)",
          }}>
            <PanelLeft size={18} strokeWidth={1.5} />
          </div>
        </div>
      </button>

      {/* Tooltip "Open Sidebar" — portal-based */}
      <SidebarTooltip show={hovered} text="Open Sidebar" anchorRef={btnRef} />
    </div>
  );
}
