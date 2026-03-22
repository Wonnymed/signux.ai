"use client";
import { useState } from "react";
import { ArrowLeft, Lock, Plus, Search } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";

/* ═══ Zinc palette ═══ */
export const Z950 = "#09090B";
export const Z800 = "#27272A";
export const Z700 = "#3F3F46";
export const Z600 = "#52525B";
export const Z500 = "#71717A";
export const Z400 = "#A1A1AA";
export const Z300 = "#D4D4D8";
export const Z200 = "#E4E4E7";

/* ═══ 3 Page Shell Types ═══
 *
 * engine    — primary product surface (Simulate, Build, Grow, etc.)
 * workspace — archive/workflow (Recent, Saved, Compare, etc.)
 * system    — utility/admin (Usage, Billing, Settings, Help)
 */
type ShellType = "engine" | "workspace" | "system";

const SHELL_MAX_WIDTH: Record<ShellType, number> = {
  engine: 780,
  workspace: 860,
  system: 720,
};

/* ═══ PageShell — shared page container ═══ */
export function PageShell({
  type = "workspace",
  children,
  noPadTop,
}: {
  type?: ShellType;
  children: React.ReactNode;
  noPadTop?: boolean;
}) {
  const isMobile = useIsMobile();
  const maxW = SHELL_MAX_WIDTH[type];

  return (
    <div style={{
      width: "100%",
      maxWidth: maxW,
      margin: "0 auto",
      padding: isMobile
        ? `${noPadTop ? 0 : 24}px 16px 64px`
        : `${noPadTop ? 0 : 40}px 32px 80px`,
    }}>
      {children}
    </div>
  );
}

/* ═══ FullPageShell — full viewport wrapper for standalone pages ═══ */
export function FullPageShell({
  type = "workspace",
  children,
  noPadTop,
}: {
  type?: ShellType;
  children: React.ReactNode;
  noPadTop?: boolean;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
    }}>
      <PageShell type={type} noPadTop={noPadTop}>
        {children}
      </PageShell>
    </div>
  );
}

/* ═══ PageHeader — consistent page header ═══ */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      display: "flex",
      alignItems: isMobile ? "flex-start" : "flex-end",
      justifyContent: "space-between",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 12 : 0,
      marginBottom: 28,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {eyebrow && (
          <span style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            letterSpacing: 1.6,
            color: Z600,
            textTransform: "uppercase",
            marginBottom: 8,
          }}>
            {eyebrow}
          </span>
        )}
        <h1 style={{
          fontSize: isMobile ? 20 : 22,
          fontWeight: 500,
          color: Z200,
          margin: 0,
          letterSpacing: 0.2,
          lineHeight: 1.3,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 13,
            color: Z500,
            margin: 0,
            marginTop: 5,
            lineHeight: 1.5,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/* ═══ BackLink — consistent "back to X" link ═══ */
export function BackLink({
  href = "/chat",
  label = "Back to Signux",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <a href={href} style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      color: Z600,
      fontSize: 12,
      textDecoration: "none",
      marginBottom: 20,
      transition: "color 180ms ease-out",
    }}
      onMouseEnter={e => e.currentTarget.style.color = Z400}
      onMouseLeave={e => e.currentTarget.style.color = Z600}
    >
      <ArrowLeft size={13} strokeWidth={1.5} /> {label}
    </a>
  );
}

/* ═══ SectionLabel — consistent section heading ═══ */
export function SectionLabel({
  children,
  count,
  style,
}: {
  children: React.ReactNode;
  count?: number;
  style?: React.CSSProperties;
}) {
  return (
    <h2 style={{
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      fontWeight: 500,
      letterSpacing: 1.6,
      color: Z600,
      textTransform: "uppercase",
      marginBottom: 12,
      marginTop: 0,
      ...style,
    }}>
      {children}{count !== undefined ? ` (${count})` : ""}
    </h2>
  );
}

/* ═══ SearchInput — consistent search field ═══ */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 14px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.015)",
      border: `1px solid ${Z800}`,
      marginBottom: 24,
    }}>
      <Search size={16} style={{ color: Z600 }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          color: Z200,
          fontSize: 14,
          outline: "none",
          fontFamily: "var(--font-body)",
        }}
      />
    </div>
  );
}

/* ═══ AuthGate — sign-in required state ═══ */
export function AuthGate({
  title = "Sign in required",
  description,
  loginHref = "/login",
}: {
  title?: string;
  description?: string;
  loginHref?: string;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 24px",
      borderRadius: 16,
      border: `1px dashed ${Z800}`,
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${Z800}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      }}>
        <Lock size={24} strokeWidth={1.5} style={{ color: Z600 }} />
      </div>
      <h3 style={{
        fontSize: 18,
        fontWeight: 500,
        color: Z200,
        marginBottom: 8,
        marginTop: 0,
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 13,
          color: Z600,
          marginBottom: 24,
          textAlign: "center",
          maxWidth: 340,
          lineHeight: 1.5,
          margin: "0 0 24px",
        }}>
          {description}
        </p>
      )}
      <button
        onClick={() => { window.location.href = loginHref; }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 24px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.08)",
          border: `1px solid ${Z800}`,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: Z200,
          transition: "all 180ms ease-out",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.12)";
          e.currentTarget.style.borderColor = Z700;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = Z800;
        }}
      >
        Sign in
      </button>
    </div>
  );
}

/* ═══ SectionCard — consistent card/section surface ═══ */
export function SectionCard({
  children,
  label,
  noPad,
}: {
  children: React.ReactNode;
  label?: string;
  noPad?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${Z800}`,
      background: "rgba(255,255,255,0.015)",
      overflow: "hidden",
      marginBottom: 16,
    }}>
      {label && (
        <div style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${Z800}`,
        }}>
          <span style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            letterSpacing: 1,
            color: Z600,
            textTransform: "uppercase",
          }}>
            {label}
          </span>
        </div>
      )}
      <div style={{ padding: noPad ? 0 : 16 }}>
        {children}
      </div>
    </div>
  );
}

/* ═══ CardGrid — consistent responsive grid ═══ */
export function CardGrid({
  children,
  minWidth = 280,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      gap: 12,
    }}>
      {children}
    </div>
  );
}

/* ═══ EmptyState — consistent empty state ═══ */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${Z800}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        {icon || (
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: Z700,
          }} />
        )}
      </div>
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        color: Z400,
        marginBottom: 6,
      }}>
        {title}
      </span>
      {description && (
        <span style={{
          fontSize: 12.5,
          color: Z600,
          maxWidth: 320,
          lineHeight: 1.5,
        }}>
          {description}
        </span>
      )}
      {action && (
        <div style={{ marginTop: 16 }}>
          {action}
        </div>
      )}
    </div>
  );
}

/* ═══ ActionButton — consistent action button ═══ */
export function ActionButton({
  children,
  onClick,
  variant = "ghost",
  size = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "filled" | "primary";
  size?: "small" | "default";
}) {
  const [hovered, setHovered] = useState(false);

  const base = {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: 6,
    padding: size === "small" ? "5px 10px" : "7px 14px",
    borderRadius: 7,
    fontSize: size === "small" ? 11.5 : 12.5,
    fontWeight: 450 as const,
    cursor: "pointer" as const,
    border: "none" as const,
    transition: "background 180ms ease-out, color 180ms ease-out, border-color 180ms ease-out",
  };

  const styles: Record<string, React.CSSProperties> = {
    ghost: {
      ...base,
      background: hovered ? "rgba(255,255,255,0.05)" : "transparent",
      color: hovered ? Z300 : Z500,
      border: `1px solid ${hovered ? Z600 : Z800}`,
    },
    filled: {
      ...base,
      background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
      color: hovered ? Z200 : Z400,
      border: `1px solid ${Z800}`,
    },
    primary: {
      ...base,
      background: hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)",
      color: Z200,
      border: "none",
    },
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

/* ═══ InlineInput — consistent inline creation input ═══ */
export function InlineInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Name...",
  submitLabel = "Create",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder?: string;
  submitLabel?: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 16px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.015)",
      border: `1px solid ${Z800}`,
      marginBottom: 20,
    }}>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          color: Z200,
          fontSize: 14,
          outline: "none",
          fontFamily: "var(--font-body)",
        }}
      />
      <button
        onClick={onSubmit}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          background: "rgba(255,255,255,0.08)",
          border: `1px solid ${Z800}`,
          color: Z200,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 180ms ease-out",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      >
        {submitLabel}
      </button>
      <button
        onClick={onCancel}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: Z600,
          padding: 4,
          fontSize: 12,
        }}
      >
        Cancel
      </button>
    </div>
  );
}

/* ═══ StatCard — for metrics/dashboard grids ═══ */
export function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 10,
      border: `1px solid ${Z800}`,
      background: "rgba(255,255,255,0.015)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        letterSpacing: 0.8,
        color: Z600,
        textTransform: "uppercase",
        marginBottom: 8,
      }}>
        {icon}
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 600,
        color: Z200,
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 11.5,
          color: Z500,
          marginTop: 4,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ═══ ListItem — consistent list row ═══ */
export function ListItem({
  children,
  onClick,
  badge,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        border: `1px solid ${Z800}`,
        background: "rgba(255,255,255,0.015)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
        transition: "background 180ms ease-out, border-color 180ms ease-out",
        marginBottom: 6,
      }}
      onMouseEnter={e => {
        if (!onClick) return;
        e.currentTarget.style.borderColor = Z700;
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={e => {
        if (!onClick) return;
        e.currentTarget.style.borderColor = Z800;
        e.currentTarget.style.background = "rgba(255,255,255,0.015)";
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
      {badge && (
        <div style={{ flexShrink: 0, marginLeft: 8 }}>
          {badge}
        </div>
      )}
    </div>
  );
}

/* ═══ Badge — consistent status badge ═══ */
export function Badge({
  children,
  color = Z500,
  bg = "rgba(255,255,255,0.04)",
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <span style={{
      fontSize: 10,
      padding: "2px 8px",
      borderRadius: 4,
      background: bg,
      color,
      textTransform: "capitalize",
      fontWeight: 500,
    }}>
      {children}
    </span>
  );
}

/* ═══ Divider — structural separator ═══ */
export function ShellDivider() {
  return (
    <div style={{
      height: 1,
      background: Z800,
      margin: "20px 0",
    }} />
  );
}
