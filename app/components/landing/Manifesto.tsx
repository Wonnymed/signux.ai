"use client";

import { useState } from "react";

const PARAGRAPHS = [
  "Every day, founders make decisions worth millions based on one AI's opinion, a gut feeling, or a consultant who takes six weeks and charges more than your runway.",
  "We think that's broken.",
  "Octux exists because the most important decisions deserve adversarial pressure-testing, structured output, and a system that gets smarter with every use.",
  "Ten specialist agents. Real debate. Structured verdict. Full audit trail. And a system that learns from every decision it touches.",
  "Not a chatbot. A Decision Operating System.",
];

export default function Manifesto() {
  const [hovered, setHovered] = useState(false);

  return (
    <section
      style={{
        width: "100%",
        background: "linear-gradient(180deg, #1A0F2E 0%, #0F0A1A 100%)",
        padding: "96px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: "#FFFFFF",
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          We believe decisions deserve more than a guess
        </h2>

        <div style={{ marginTop: 32 }}>
          {PARAGRAPHS.map((p, i) => (
            <p
              key={i}
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: "rgba(255,255,255,0.70)",
                lineHeight: 1.8,
                margin: 0,
                marginTop: i > 0 ? 24 : 0,
              }}
            >
              {p}
            </p>
          ))}
        </div>

        <a
          href="#top"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          style={{
            display: "inline-block",
            marginTop: 40,
            fontSize: 16,
            fontWeight: 500,
            color: "#8B5CF6",
            textDecoration: hovered ? "underline" : "none",
            textUnderlineOffset: 4,
            cursor: "pointer",
            transition: "text-decoration 150ms ease-out",
          }}
        >
          Start deciding →
        </a>
      </div>
    </section>
  );
}
