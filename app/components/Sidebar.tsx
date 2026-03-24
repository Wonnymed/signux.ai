"use client";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare, Zap, Swords, Hammer, TrendingUp, UserCheck, Shield,
  Settings, LogIn, LogOut, Trash2, ChevronDown,
  LayoutDashboard, PanelLeft, Monitor, Sun, Moon, Home,
  BookOpen, Clock, CreditCard, HelpCircle, BarChart3, GitCompareArrows, FlaskConical,
  Star,
} from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { t } from "../lib/i18n";
import type { Mode } from "../lib/types";
import { ENGINES, SIGNUX_GOLD, type EngineId } from "../lib/engines";
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
  onOpenAuth?: () => void;
};

/* ═══ Zinc palette — premium neutral hierarchy ═══ */
const Z950 = "#09090B";  // deepest
const Z800 = "#27272A";
const Z700 = "#3F3F46";  // section labels, plan badge
const Z600 = "#52525B";  // Zone B idle icons
const Z500 = "#71717A";  // Zone A idle text, Zone B hover
const Z400 = "#A1A1AA";  // Zone A hover text
const Z300 = "#D4D4D8";  // active icons
const Z200 = "#E4E4E7";  // active text

const ICON_IDLE = Z600;
const ICON_ACTIVE = Z200;

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
function SidebarIconButton({ icon, tooltip, active, activeColor, modeColor, onClick, suppressTooltip, size = 38 }: {
  icon: React.ReactNode;
  tooltip: string;
  active?: boolean;
  activeColor?: string;
  modeColor?: string;
  onClick: () => void;
  suppressTooltip?: boolean;
  size?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  const iconColor = active
    ? (activeColor || Z300)
    : hovered ? Z400 : (modeColor || Z600);

  const bgColor = active
    ? (activeColor ? `${activeColor}0F` : "rgba(255,255,255,0.06)")
    : hovered
      ? "rgba(255,255,255,0.035)"
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
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        border: "none",
        padding: 0,
        background: bgColor,
        color: iconColor,
        transition: "background 180ms ease-out, color 180ms ease-out",
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
        {menuItem(<CreditCard size={15} strokeWidth={1.5} />, "Billing & Plan", () => { window.location.href = "/billing"; })}
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
  onOpenAuth,
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
      router.push(m === "chat" ? "/chat" : `/chat?mode=${m}`);
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

  // Expanded sidebar state — must be at top level (not inside render functions)
  const [recentOpen, setRecentOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  const iconSize = 18;
  const iconSW = 1.5;
  const sidebarWidth = open ? 240 : 52;

  // Zone B — workspace item (quieter than engines)
  const workspaceItem = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "7px 10px 7px 12px", border: "none",
        borderRadius: 7, cursor: "pointer",
        fontSize: 12.5, textAlign: "left", background: "transparent",
        color: Z600, fontWeight: 400, letterSpacing: 0.05,
        transition: "background 180ms ease-out, color 180ms ease-out",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = Z400; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = Z600; }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // Zone B — expandable item (with chevron + optional count)
  const workspaceExpandableItem = (icon: React.ReactNode, label: string, isOpen: boolean, onClick: () => void, count?: number) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "7px 10px 7px 12px", border: "none",
        borderRadius: 7, cursor: "pointer",
        fontSize: 12.5, textAlign: "left", background: "transparent",
        color: Z600, fontWeight: 400, letterSpacing: 0.05,
        transition: "background 180ms ease-out, color 180ms ease-out",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = Z400; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = Z600; }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: Z700, fontWeight: 500 }}>{count}</span>
      )}
      <ChevronDown size={11} style={{
        color: Z700, opacity: 0.6,
        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
        transition: "transform 200ms ease-out",
      }} />
    </button>
  );

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 199 }} />}
        <aside ref={sidebarRef} style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 200,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms ease",
          background: "var(--sidebar-bg, var(--bg-primary))", borderRight: "1px solid var(--border-primary)",
          display: "flex", flexDirection: "column",
        }}>
          {renderExpandedContent()}
        </aside>

        <ProfilePopover
          anchorRef={avatarRef}
          isOpen={profilePopoverOpen}
          onClose={() => setProfilePopoverOpen(false)}
          authUser={authUser}
          userInitials={userInitials}
          displayName={displayName}
          tier={tier}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
          sidebarWidth={280}
        />
      </>
    );
  }

  // Desktop: single sidebar, collapsed 56px / expanded 260px
  return (
    <>
      {/* Backdrop when sidebar is expanded — only for logged-in users (guest sidebar stays open) */}
      {open && isLoggedIn && (
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
        background: "var(--sidebar-bg, var(--bg-primary))",
        borderRight: "1px solid var(--border-secondary, rgba(255,255,255,0.04))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 200ms ease",
      }}>
        {open ? renderExpandedContent() : renderCollapsedContent()}
      </aside>

      {/* Profile popover — portal-based, works from both collapsed/expanded */}
      <ProfilePopover
        anchorRef={avatarRef}
        isOpen={profilePopoverOpen}
        onClose={() => setProfilePopoverOpen(false)}
        authUser={authUser}
        userInitials={userInitials}
        displayName={displayName}
        tier={tier}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
        sidebarWidth={sidebarWidth}
      />
    </>
  );

  // ═══ EXPANDED ═══
  function renderExpandedContent() {
    const convList = conversations;
    const isLoading = loadingHistory || convList === undefined;

    return (
      <>
        {/* ═══ TOP — Wordmark ═══ */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 12px 0 16px", height: 48, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <SignuxIcon variant="gold" size={15} />
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: 11.5, fontWeight: 500,
              letterSpacing: 3.5, color: "var(--text-secondary)",
            }}>
              SIGNUX
            </span>
          </div>
          <CloseButtonWithTooltip hovered={closeHovered} setHovered={setCloseHovered} onClick={onClose} />
        </div>

        {/* ═══ HOME ═══ */}
        <div style={{ padding: "4px 8px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(() => {
              const isHomeActive = mode === "chat";
              return (
                <button
                  onClick={() => handleMode("chat" as Mode)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "8px 10px",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer", fontSize: 13, textAlign: "left",
                    background: isHomeActive ? "var(--bg-hover, rgba(255,255,255,0.04))" : "transparent",
                    color: isHomeActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isHomeActive ? 500 : 400,
                    transition: "background 180ms ease-out, color 180ms ease-out",
                  }}
                  onMouseEnter={e => { if (!isHomeActive) { e.currentTarget.style.background = "var(--bg-hover, rgba(255,255,255,0.03))"; } }}
                  onMouseLeave={e => { if (!isHomeActive) { e.currentTarget.style.background = "transparent"; } }}
                >
                  <Home size={16} strokeWidth={1.5} style={{ color: isHomeActive ? "var(--text-primary)" : Z600, flexShrink: 0, transition: "color 180ms ease-out" }} />
                  <span>Home</span>
                </button>
              );
            })()}
          </div>
        </div>

        {/* ═══ ZONE A — DECISION ENGINES ═══ */}
        <div style={{ padding: "4px 8px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {ENGINE_MODES.map(({ key, icon: Icon, name }) => {
              const isActive = mode === key;
              const engineColor = ENGINES[key as EngineId]?.color || "#9CA3AF";
              return (
                <button
                  key={key}
                  onClick={() => handleMode(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "8px 10px",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer", fontSize: 13, textAlign: "left",
                    background: isActive ? "var(--bg-hover, rgba(255,255,255,0.04))" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isActive ? 500 : 400,
                    transition: "background 180ms ease-out, color 180ms ease-out",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--bg-hover, rgba(255,255,255,0.03))"; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; } }}
                >
                  <Icon size={16} strokeWidth={1.5} style={{ color: isActive ? engineColor : Z600, flexShrink: 0, transition: "color 180ms ease-out" }} />
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ═══ BOTTOM — Upgrade + Profile (logged in only) ═══ */}
        {isLoggedIn && (
          <div style={{ padding: "0 8px 10px", flexShrink: 0 }}>
            {/* Upgrade button — only for free and pro */}
            {tier !== "max" && tier !== "founding" && (
              <button
                onClick={() => { router.push("/billing"); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", padding: "8px 10px",
                  border: "none", borderRadius: 7,
                  cursor: "pointer", fontSize: 12.5, textAlign: "left",
                  background: "transparent",
                  color: SIGNUX_GOLD,
                  fontWeight: 500,
                  transition: "background 180ms ease-out",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(200,168,78,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <Star size={14} strokeWidth={1.5} style={{ color: SIGNUX_GOLD }} />
                <span>{tier === "pro" ? "Upgrade to Max" : "Upgrade to Pro"}</span>
              </button>
            )}

            {/* Profile row */}
            <button
              ref={avatarRef}
              onClick={() => { setProfilePopoverOpen(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                width: "100%", padding: "8px 10px",
                border: "none", borderRadius: 7,
                cursor: "pointer", textAlign: "left",
                background: "transparent",
                transition: "background 180ms ease-out",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover, rgba(255,255,255,0.03))"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {authUser?.avatar ? (
                <img src={authUser.avatar} alt={displayName} width={28} height={28}
                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: SIGNUX_GOLD,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 600, color: "#FFFFFF",
                  flexShrink: 0,
                }}>
                  {userInitials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {displayName}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ═══ BOTTOM — Guest login block (not logged in only) ═══ */}
        {!isLoggedIn && (
          <div style={{
            padding: "0 8px 12px", flexShrink: 0,
          }}>
            <div style={{
              padding: "12px 10px 8px",
            }}>
              <div style={{
                fontSize: 11, color: "var(--text-tertiary)",
                lineHeight: 1.5, marginBottom: 10,
                opacity: 0.7,
              }}>
                Sign in to save decisions and unlock all engines.
              </div>
              <button
                onClick={() => { onOpenAuth ? onOpenAuth() : window.location.href = "/login"; }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 7, width: "100%", padding: "8px 0",
                  borderRadius: 7, border: "none",
                  background: "var(--bg-hover, rgba(255,255,255,0.04))",
                  color: "var(--text-secondary)",
                  fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                  transition: "all 180ms ease-out",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--bg-hover, rgba(255,255,255,0.04))";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <LogIn size={14} strokeWidth={1.5} />
                Log in
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ═══ COLLAPSED ═══
  function renderCollapsedContent() {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        height: "100%", padding: "6px 0 12px",
      }}>
        {/* Logo */}
        <CollapsedLogoButton onClick={onOpen} />

        <div style={{ height: 10 }} />

        {/* ═══ HOME icon ═══ */}
        <SidebarIconButton
          icon={<Home size={iconSize} strokeWidth={iconSW} />}
          tooltip="Home"
          active={mode === "chat"}
          modeColor={ICON_IDLE}
          onClick={() => handleMode("chat" as Mode)}
          size={34}
        />

        {/* Separator */}
        <div style={{ width: 16, height: 1, background: "var(--border-secondary, rgba(255,255,255,0.04))", margin: "6px 0" }} />

        {/* ═══ ZONE A — 6 engine icons ═══ */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {ENGINE_MODES.map(({ key, icon: Icon, name }) => (
            <SidebarIconButton
              key={key}
              icon={<Icon size={iconSize} strokeWidth={iconSW} />}
              tooltip={name}
              active={mode === key}
              activeColor={ENGINES[key as EngineId]?.color}
              modeColor={ICON_IDLE}
              onClick={() => handleMode(key)}
              size={34}
            />
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* ═══ BOTTOM — Profile icon (logged in only) ═══ */}
        {isLoggedIn && (
          <SidebarIconButton
            icon={
              authUser?.avatar ? (
                <img src={authUser.avatar} alt={displayName} width={26} height={26} style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} referrerPolicy="no-referrer" />
              ) : (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: SIGNUX_GOLD,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 600, color: "#FFFFFF",
                }}>
                  {userInitials}
                </div>
              )
            }
            tooltip={displayName || "Profile"}
            onClick={() => { setProfilePopoverOpen(true); }}
            size={34}
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
          width: 30, height: 30, borderRadius: 8,
          border: "none", padding: 0,
          background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          color: hovered ? Z300 : Z600,
          transition: "background 180ms ease-out, color 180ms ease-out",
        }}
      >
        <PanelLeft size={15} strokeWidth={1.5} />
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
          width: 34,
          height: 34,
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          border: "none",
          padding: 0,
          background: hovered ? "rgba(255,255,255,0.05)" : "transparent",
          transition: "background 200ms ease-out",
        }}
      >
        <div style={{ position: "relative", width: 18, height: 18 }}>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 0 : 1,
            transition: "opacity 220ms ease-out",
          }}>
            <SignuxIcon variant="gold" size={18} />
          </div>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 220ms ease-out",
            color: Z300,
          }}>
            <PanelLeft size={15} strokeWidth={1.5} />
          </div>
        </div>
      </button>

      <SidebarTooltip show={hovered} text="Open Sidebar" anchorRef={btnRef} />
    </div>
  );
}
