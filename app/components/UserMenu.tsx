"use client";
import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import type { AuthUser } from "../lib/auth";

export default function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "fixed", top: 14, right: 20, zIndex: 100 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 32, height: 32, borderRadius: "50%", overflow: "hidden",
          background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0,
        }}
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{user.initials}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 40, right: 0, width: 240,
          background: "var(--bg-primary)", border: "1px solid var(--border-secondary)",
          borderRadius: "var(--radius-sm)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          padding: 8, animation: "fadeIn 0.15s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 12px" }}>
            {user.avatar ? (
              <img src={user.avatar} alt="" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{user.initials}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border-secondary)", margin: "0 4px 4px" }} />
          <button
            onClick={() => { onSignOut(); setOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 8px", border: "none", background: "none",
              borderRadius: "var(--radius-xs)", cursor: "pointer",
              color: "var(--text-secondary)", fontSize: 13,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
