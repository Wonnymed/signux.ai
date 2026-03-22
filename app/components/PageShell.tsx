"use client";
import { useIsMobile } from "../lib/useIsMobile";

/* ═══ Zinc palette ═══ */
const Z800 = "#27272A";
const Z700 = "#3F3F46";
const Z600 = "#52525B";
const Z500 = "#71717A";
const Z400 = "#A1A1AA";
const Z200 = "#E4E4E7";

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

/* ═══ EmptyState — consistent empty state ═══ */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
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
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: Z700,
        }} />
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

import { useState } from "react";

/* ═══ StatCard — for metrics/dashboard grids ═══ */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 10,
      border: `1px solid ${Z800}`,
      background: "rgba(255,255,255,0.015)",
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        letterSpacing: 1,
        color: Z600,
        textTransform: "uppercase",
        marginBottom: 8,
      }}>
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
