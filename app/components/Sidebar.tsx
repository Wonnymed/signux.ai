"use client";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare, Zap, Shield, Rocket, Globe, TrendingUp,
  Settings, LogIn, LogOut, Trash2, FolderOpen, Plus, ChevronDown,
  X, Upload, LayoutDashboard, PanelLeft, Crown,
} from "lucide-react";
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

const MODES: { key: Mode; icon: any; label: string; color: string }[] = [
  { key: "chat", icon: MessageSquare, label: "sidebar.mode_chat", color: "#A8A29E" },
  { key: "simulate", icon: Zap, label: "sidebar.mode_simulate", color: "#D4AF37" },
  { key: "intel", icon: Shield, label: "sidebar.mode_intel", color: "#EF4444" },
  { key: "launchpad", icon: Rocket, label: "sidebar.mode_launchpad", color: "#3B82F6" },
  { key: "globalops", icon: Globe, label: "sidebar.mode_globalops", color: "#10B981" },
  { key: "invest", icon: TrendingUp, label: "sidebar.mode_invest", color: "#8B5CF6" },
];

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
      background: "#252322",
      border: "1px solid #2E2A27",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      whiteSpace: "nowrap",
      zIndex: 10000,
      pointerEvents: "none",
      animation: "tooltipFadeIn 150ms ease-out forwards",
    }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#F3F0EC" }}>
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

  // Mode-colored icon: idle=50% opacity, hover=full, active=full
  const iconColor = modeColor
    ? (active ? modeColor : hovered ? modeColor : `${modeColor}80`)
    : active
      ? (activeColor || "var(--accent)")
      : isPrimary
        ? (hovered ? "var(--accent)" : "var(--text-primary)")
        : hovered
          ? "var(--text-primary)"
          : "var(--text-tertiary)";

  const bgColor = modeColor
    ? (active ? `${modeColor}1A` : hovered ? `${modeColor}0F` : "transparent")
    : active
      ? "rgba(212,175,55,0.12)"
      : hovered
        ? "rgba(255,255,255,0.06)"
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
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)"}
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
        background: "var(--card-bg, #252322)",
        border: "1px solid var(--border-secondary, #2E2A27)",
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
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 600, color: "var(--accent)",
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
  tier, usage, limits,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const iconSize = 18;
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
          background: "var(--bg-sidebar)", borderRight: "1px solid var(--sidebar-border)",
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
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
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

    return (
      <>
        {/* Header — logo left, PanelLeft close button right */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 12px 12px 16px",
          height: 56,
          borderBottom: "1px solid var(--border-secondary)",
        }}>
          {/* Logo + brand name */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SignuxIcon variant="gold" size={20} />
            <span style={{
              fontFamily: "var(--font-brand)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2.5,
              color: "var(--text-primary)",
            }}>
              SIGNUX
            </span>
          </div>

          {/* Close button — PanelLeft icon */}
          <CloseButtonWithTooltip hovered={closeHovered} setHovered={setCloseHovered} onClick={onClose} />
        </div>

        {/* New chat */}
        <div style={{ padding: "8px 8px 8px" }}>
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

        {/* Projects — navigates to /projects page */}
        <div style={{ padding: "0 8px 8px" }}>
          <button
            onClick={() => { router.push("/projects"); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 12px", border: "none",
              borderRadius: "var(--radius-xs)", background: "transparent",
              cursor: "pointer", color: "var(--text-secondary)", fontSize: 13,
              transition: "all 150ms", textAlign: "left",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <FolderOpen size={16} strokeWidth={1.5} style={{ color: activeProject?.color || "var(--text-tertiary)", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Projects</span>
            <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.3, transform: "rotate(-90deg)" }} />
          </button>
        </div>

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
                <Icon size={16} strokeWidth={1.5} style={{ color: color }} />
                <span style={{ flex: 1 }}>{t(label)}</span>
              </button>
              {idx === 3 && (
                <div style={{ height: 1, width: "calc(100% - 16px)", background: "var(--border-secondary)", margin: "4px 8px" }} />
              )}
            </div>
          ))}
        </div>

        {/* BUG 4 FIX: Settings button in expanded sidebar */}
        <div style={{ padding: "0 8px 8px" }}>
          <button
            onClick={() => { onOpenSettings(); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 12px", border: "none",
              borderRadius: "var(--radius-xs)", cursor: "pointer", fontSize: 13, transition: "all 0.15s", textAlign: "left",
              background: "transparent",
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Settings size={16} strokeWidth={1.5} />
            <span style={{ flex: 1 }}>Settings</span>
          </button>
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
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px", minHeight: 200 }}>
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
          {isLoading ? (
            <HistorySkeleton />
          ) : convList && convList.length === 0 ? (
            <div style={{ padding: "24px 4px", fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", fontStyle: "italic", opacity: 0.4 }}>
              <MessageSquare size={12} style={{ marginBottom: 4, display: "block", margin: "0 auto 6px" }} />
              Start a conversation
            </div>
          ) : convList ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {groupByDate(convList).map(group => (
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
          ) : null}
        </div>

        {/* Bottom */}
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

          {/* Upgrade to Pro card — shown for free users */}
          {showUpgrade && (
            <div
              onClick={() => router.push("/pricing")}
              style={{
                margin: "0 0 4px",
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(212,175,55,0.04)",
                border: "1px solid rgba(212,175,55,0.1)",
                cursor: "pointer",
                transition: "all 150ms",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,175,55,0.08)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(212,175,55,0.04)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.1)"; }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#D4AF37" }}>Upgrade to Pro</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Unlock all modes & tools</div>
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Crown size={14} style={{ color: "#D4AF37" }} />
              </div>
            </div>
          )}

          {/* Profile row — click opens popover */}
          {isLoggedIn && displayName ? (
            <button
              ref={avatarRef}
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
                  background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, color: "var(--accent)",
                }}>
                  {userInitials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </div>
              </div>
            </button>
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
        {/* Logo — hover substitutes PanelLeft icon, click opens sidebar */}
        <CollapsedLogoButton onClick={onOpen} />

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
                modeColor={color}
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

        {/* Upgrade to Pro — replaces Settings (Settings is in profile menu) */}
        {tier !== "pro" && tier !== "max" && tier !== "founding" && (
          <SidebarIconButton
            icon={<Crown size={iconSize} strokeWidth={iconSW} />}
            tooltip="Upgrade to Pro"
            modeColor="#D4AF37"
            onClick={() => router.push("/pricing")}
          />
        )}

        <div style={{ height: 8 }} />

        {/* Bottom — avatar */}
        {isLoggedIn ? (
          <SidebarIconButton
            icon={
              authUser?.avatar ? (
                <img src={authUser.avatar} alt={displayName} width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} referrerPolicy="no-referrer" />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(212,175,55,0.08)",
                  border: "1px solid rgba(212,175,55,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, color: "var(--accent)",
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
