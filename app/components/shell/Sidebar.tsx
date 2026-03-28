"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Zap,
  Hammer,
  TrendingUp,
  Users,
  Shield,
  Swords,
  Star,
  User,
} from "lucide-react";

/* ═══ Engine definitions ═══ */
type Engine = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
};

const ENGINES: Engine[] = [
  { id: "simulate", label: "Simulate", icon: Zap, color: "var(--engine-simulate)" },
  { id: "build", label: "Build", icon: Hammer, color: "var(--engine-build)" },
  { id: "grow", label: "Grow", icon: TrendingUp, color: "var(--engine-grow)" },
  { id: "hire", label: "Hire", icon: Users, color: "var(--engine-hire)" },
  { id: "protect", label: "Protect", icon: Shield, color: "var(--engine-protect)" },
  { id: "compete", label: "Compete", icon: Swords, color: "var(--engine-compete)" },
];

const COLLAPSED = 56;
const EXPANDED = 200;

type SidebarProps = {
  activeEngine: string | null;
  onSelectEngine: (id: string | null) => void;
};

export default function Sidebar({ activeEngine, onSelectEngine }: SidebarProps) {
  const [hovered, setHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isExpanded = hovered;
  const width = isExpanded ? EXPANDED : COLLAPSED;

  // Detect if we're on a sim page → Simulate should be active
  const isSimPage = pathname.startsWith("/sim");
  const resolvedActive = isSimPage ? "simulate" : activeEngine;

  const handleSelect = useCallback(
    (id: string | null) => {
      onSelectEngine(id);
    },
    [onSelectEngine],
  );

  return (
    <motion.aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredItem(null);
      }}
      animate={{ width }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* OX Logo */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
          cursor: "pointer",
        }}
        onClick={() => { router.push("/"); handleSelect(null); }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          OX
        </div>
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.1 }}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: 0.3,
              whiteSpace: "nowrap",
            }}
          >
            OCTUX AI
          </motion.span>
        )}
      </div>

      {/* Home */}
      <SidebarItem
        icon={Home}
        label="Home"
        active={resolvedActive === null}
        color="#1A1815"
        expanded={isExpanded}
        hovered={hoveredItem === "home"}
        onHover={(h) => setHoveredItem(h ? "home" : null)}
        onClick={() => { router.push("/"); handleSelect(null); }}
      />

      {/* Separator */}
      <div
        style={{
          height: 1,
          margin: "4px 12px",
          background: "var(--border-subtle)",
        }}
      />

      {/* Engines */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        {ENGINES.map((engine) => (
          <SidebarItem
            key={engine.id}
            icon={engine.icon}
            label={engine.label}
            active={resolvedActive === engine.id}
            color={engine.color}
            expanded={isExpanded}
            hovered={hoveredItem === engine.id}
            onHover={(h) => setHoveredItem(h ? engine.id : null)}
            onClick={() => handleSelect(engine.id)}
          />
        ))}
      </div>

      {/* Bottom: Upgrade + Profile */}
      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
        <div
          style={{
            height: 1,
            margin: "4px 12px",
            background: "var(--border-subtle)",
          }}
        />
        <SidebarItem
          icon={Star}
          label="Upgrade"
          active={false}
          color="var(--accent)"
          expanded={isExpanded}
          hovered={hoveredItem === "upgrade"}
          onHover={(h) => setHoveredItem(h ? "upgrade" : null)}
          onClick={() => {}}
        />
        <SidebarItem
          icon={User}
          label="Profile"
          active={false}
          color="var(--icon-secondary)"
          expanded={isExpanded}
          hovered={hoveredItem === "profile"}
          onHover={(h) => setHoveredItem(h ? "profile" : null)}
          onClick={() => {}}
        />
      </div>
    </motion.aside>
  );
}

/* ═══ SidebarItem ═══ */
type SidebarItemProps = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  active: boolean;
  color: string;
  expanded: boolean;
  hovered: boolean;
  onHover: (h: boolean) => void;
  onClick: () => void;
};

function SidebarItem({
  icon: Icon,
  label,
  active,
  color,
  expanded,
  hovered,
  onHover,
  onClick,
}: SidebarItemProps) {
  const iconColor = active
    ? color
    : hovered
      ? "var(--icon-primary)"
      : "var(--icon-secondary)";

  const textColor = active
    ? "var(--text-primary)"
    : hovered
      ? "var(--text-primary)"
      : "var(--text-secondary)";

  const bgColor = active
    ? "var(--accent-muted)"
    : hovered
      ? "var(--surface-2)"
      : "transparent";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 36,
        margin: "1px 8px",
        padding: "0 8px",
        borderRadius: "var(--radius-md)",
        background: bgColor,
        border: "none",
        cursor: "pointer",
        transition: "all var(--transition-normal)",
        width: "calc(100% - 16px)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: iconColor,
        }}
      >
        <Icon size={18} strokeWidth={active ? 2 : 1.5} />
      </div>
      {expanded && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.1 }}
          style={{
            fontSize: 13,
            fontWeight: active ? 500 : 400,
            color: textColor,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </motion.span>
      )}
    </button>
  );
}
