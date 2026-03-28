import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title") || "Signux AI Analysis";
  const verdict = req.nextUrl.searchParams.get("verdict") || "";
  const score = req.nextUrl.searchParams.get("score") || "";
  const type = req.nextUrl.searchParams.get("type") || "simulate";

  const typeColors: Record<string, string> = {
    simulate: "#D4AF37",
    intel: "#DC2626",
    invest: "#6B6560",
    launchpad: "#14B8A6",
  };
  const accentColor = typeColors[type] || "#D4AF37";

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        background: "#0a0a0a", padding: 60,
      }}>
        <div style={{
          fontSize: 18, fontWeight: 700, letterSpacing: 8,
          color: "#D4AF37", marginBottom: 8,
        }}>
          SIGNUX AI
        </div>
        <div style={{
          fontSize: 12, color: "#666", marginBottom: 40,
          letterSpacing: 2,
        }}>
          DECISION INTELLIGENCE
        </div>
        <div style={{
          fontSize: 36, fontWeight: 700, color: "#fff",
          textAlign: "center", maxWidth: 900, lineHeight: 1.3,
          marginBottom: 24,
        }}>
          {title.slice(0, 80)}
        </div>
        {verdict && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 32px", borderRadius: 50,
            background: verdict === "GO" ? "rgba(34,197,94,0.15)"
              : verdict === "CAUTION" ? "rgba(245,158,11,0.15)"
              : "rgba(239,68,68,0.15)",
            border: `2px solid ${verdict === "GO" ? "#22c55e"
              : verdict === "CAUTION" ? "#f59e0b" : "#ef4444"}`,
          }}>
            <span style={{
              fontSize: 28, fontWeight: 800,
              color: verdict === "GO" ? "#22c55e"
                : verdict === "CAUTION" ? "#f59e0b" : "#ef4444",
            }}>
              {verdict}
            </span>
            {score && (
              <span style={{ fontSize: 20, color: "#999" }}>
                {score}/10
              </span>
            )}
          </div>
        )}
        <div style={{
          position: "absolute", bottom: 40, fontSize: 14, color: "#444",
        }}>
          See what happens before it happens — signux.ai
        </div>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 4, background: accentColor,
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
