"use client";

import { useState } from "react";

const LINKS = ["Product", "Pricing", "About", "Twitter", "GitHub"];

export default function Footer() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <footer
      style={{
        width: "100%",
        background: "var(--surface-1)",
        borderTop: "1px solid var(--border-default)",
        padding: "48px 24px",
      }}
    >
      <div className="footer-inner">
        {/* Left */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#C75B2A",
              }}
            >
              OX
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: "var(--text-tertiary)",
              }}
            >
              OCTUX AI
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: "var(--text-tertiary)",
              margin: "8px 0 0",
            }}
          >
            © 2026 Octux AI. All rights reserved.
          </p>
        </div>

        {/* Right */}
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {LINKS.map((link) => (
            <a
              key={link}
              href="#"
              onMouseEnter={() => setHovered(link)}
              onMouseLeave={() => setHovered(null)}
              style={{
                fontSize: 14,
                fontWeight: 400,
                color:
                  hovered === link
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                textDecoration: "none",
                transition: "color 150ms ease-out",
              }}
            >
              {link}
            </a>
          ))}
        </nav>
      </div>

      <style>{`
        .footer-inner {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (max-width: 640px) {
          .footer-inner {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 24px;
          }
        }
      `}</style>
    </footer>
  );
}
