"use client";
import Link from "next/link";
import { SignuxIcon } from "./SignuxIcon";
import { useIsMobile } from "../lib/useIsMobile";
import type { Mode } from "../lib/types";

const MODE_MAP: Record<string, Mode> = {
  "Chat": "chat",
  "Simulate": "simulate",
  "Intel": "intel",
  "Launchpad": "launchpad",
  "Global Ops": "globalops",
  "Invest": "invest",
};

type FooterLink = { text: string; href?: string; mode?: string; badge?: string };

const FOOTER_COLS: { header: string; links: FooterLink[] }[] = [
  { header: "PRODUCT", links: [
    { text: "Chat", mode: "Chat" },
    { text: "Simulate", mode: "Simulate" },
    { text: "Intel", mode: "Intel" },
    { text: "Launchpad", mode: "Launchpad" },
    { text: "Global Ops", mode: "Global Ops" },
    { text: "Invest", mode: "Invest" },
    { text: "Pricing", href: "/pricing" },
  ]},
  { header: "LEARN", links: [
    { text: "Use Cases", href: "/use-cases" },
    { text: "Changelog", href: "/changelog" },
  ]},
  { header: "COMPANY", links: [
    { text: "About", href: "/about" },
  ]},
];

export default function SignuxFooter({ onSetMode }: { onSetMode?: (m: Mode) => void }) {
  const isMobile = useIsMobile();

  return (
    <footer style={{
      borderTop: "1px solid var(--divider)",
      padding: isMobile ? "32px 16px 24px" : "48px 24px 32px",
      maxWidth: 880, margin: "0 auto", width: "100%",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "1.5fr 1fr 1fr 1fr",
        gap: isMobile ? 24 : 32, marginBottom: 40,
      }}>
        {/* Brand */}
        <div style={{ gridColumn: isMobile ? "1 / -1" : undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <SignuxIcon size={24} color="var(--accent)" />
            <span style={{
              fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 16,
              letterSpacing: 3, color: "var(--text-primary)",
            }}>
              SIGNUX <span style={{ fontWeight: 300, opacity: 0.3, letterSpacing: 2 }}>AI</span>
            </span>
          </div>
          <div style={{
            fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, maxWidth: 200,
          }}>
            Build smarter. Launch faster. Decide with confidence.
          </div>
        </div>

        {/* Columns */}
        {FOOTER_COLS.map(col => (
          <div key={col.header}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5,
              textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 12,
            }}>
              {col.header}
            </div>
            {col.links.map((link, i) => {
              const mode = link.mode ? MODE_MAP[link.mode] : undefined;
              const isLink = !!link.href;

              if (isLink) {
                return (
                  <Link
                    key={i}
                    href={link.href!}
                    style={{
                      display: "block", fontSize: 12, color: "var(--text-secondary)",
                      padding: "3px 0", textDecoration: "none", transition: "color 150ms",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                  >
                    {link.text}
                    {link.badge && (
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: 1,
                        background: "var(--accent-soft)", color: "var(--accent)",
                        padding: "1px 4px", borderRadius: 3, marginLeft: 4,
                      }}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              }

              return (
                <div
                  key={i}
                  onClick={mode ? () => onSetMode?.(mode) : undefined}
                  style={{
                    display: "block", fontSize: 12, color: "var(--text-secondary)",
                    padding: "3px 0", cursor: mode ? "pointer" : "default",
                    textDecoration: "none", transition: "color 150ms",
                  }}
                  onMouseEnter={e => { if (mode) e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  {link.text}
                  {link.badge && (
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: 1,
                      background: "var(--accent-soft)", color: "var(--accent)",
                      padding: "1px 4px", borderRadius: 3, marginLeft: 4,
                    }}>
                      {link.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 20, borderTop: "1px solid var(--divider)",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          © 2026 Signux AI. All rights reserved.
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/terms" style={{ fontSize: 11, color: "var(--text-tertiary)", textDecoration: "none" }}>Terms</Link>
          <Link href="/terms" style={{ fontSize: 11, color: "var(--text-tertiary)", textDecoration: "none" }}>Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
