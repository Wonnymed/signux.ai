"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Globe, ArrowDown, Wand2, Loader2, Lock,
  MapPin, Scale, Languages, Building2, Plane,
} from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { getProfile } from "../lib/profile";
import MessageBlock from "./MessageBlock";
import ChatInput, { type FileAttachment } from "./ChatInput";
import type { Message, Mode } from "../lib/types";
import { useEnhance } from "../lib/useEnhance";
import { signuxFetch } from "../lib/api-client";

const PURPLE = "#8B5CF6";

const REGIONS = [
  { region: "North America", emoji: "\u{1F1FA}\u{1F1F8}", value: "north-america" },
  { region: "Europe", emoji: "\u{1F1EA}\u{1F1FA}", value: "europe" },
  { region: "Latin America", emoji: "\u{1F1E7}\u{1F1F7}", value: "latam" },
  { region: "East Asia", emoji: "\u{1F1F0}\u{1F1F7}", value: "east-asia" },
  { region: "South Asia", emoji: "\u{1F1EE}\u{1F1F3}", value: "south-asia" },
  { region: "Middle East", emoji: "\u{1F1E6}\u{1F1EA}", value: "middle-east" },
  { region: "Africa", emoji: "\u{1F1F3}\u{1F1EC}", value: "africa" },
  { region: "Oceania", emoji: "\u{1F1E6}\u{1F1FA}", value: "oceania" },
];

const ANALYSIS_TOOLS = [
  {
    icon: MapPin,
    name: "Market Entry Strategy",
    desc: "Full playbook to enter a new market",
    prompt: "Create a complete market entry strategy for my business expanding to [REGION]. Cover: market size, regulations, competition, cultural considerations, pricing, distribution, and timeline.",
  },
  {
    icon: Scale,
    name: "Regulatory Scan",
    desc: "Laws, taxes, and compliance requirements",
    prompt: "What are the key regulatory requirements, taxes, import duties, and compliance rules for operating a business in [COUNTRY]? Include: business registration, labor laws, data privacy, and industry-specific regulations.",
  },
  {
    icon: Languages,
    name: "Cultural Intelligence",
    desc: "How to adapt your business to local culture",
    prompt: "Give me a cultural intelligence briefing for doing business in [COUNTRY/REGION]. Cover: communication styles, negotiation norms, business etiquette, consumer behavior, marketing taboos, and local partnerships.",
  },
  {
    icon: Building2,
    name: "Competitive Landscape",
    desc: "Who are the local players and how to win",
    prompt: "Map the competitive landscape for [INDUSTRY] in [COUNTRY]. Who are the top local competitors? What are their strengths, weaknesses, and market share? Where are the gaps I can exploit?",
  },
];

/* ═══ Main Component ═══ */
export default function GlobalOpsView({ lang, onSetMode, isLoggedIn, tier }: { lang: string; onSetMode?: (m: Mode) => void; isLoggedIn?: boolean; tier?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { enhance, enhancing, wasEnhanced } = useEnhance("globalops");

  const bottomRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const scrollRaf = useRef(0);
  const retryRef = useRef<{ text: string } | null>(null);

  const profileName = getProfile()?.name || "";
  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  /* ── Scroll handling ── */
  const handleScroll = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const dist = area.scrollHeight - area.scrollTop - area.clientHeight;
    isNearBottomRef.current = dist < 100;
    setUserScrolledUp(dist > 200);
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setUserScrolledUp(false);
  }, []);

  /* ── Retry effect ── */
  useEffect(() => {
    if (retryRef.current && !loading) {
      const { text } = retryRef.current;
      retryRef.current = null;
      send(text);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  /* ── Send ── */
  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (!isLoggedIn) { window.location.href = "/signup"; return; }
    if (!["pro", "max", "founding"].includes(tier || "")) { setShowPaywall(true); return; }

    const userMsg: Message = { role: "user", content: msg, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setSearching(false);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await signuxFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, profile: getProfile(), mode: "globalops" }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "searching") {
                setSearching(true);
              } else if (data.type === "text") {
                setSearching(false);
                fullText += data.text;
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              } else if (data.type === "tool") {
                fullText += `\n\n---\n**${data.name.replace(/_/g, " ")}**\n`;
                if (data.result?.breakdown) {
                  fullText += "\n| Item | Value |\n|---|---|\n";
                  Object.entries(data.result.breakdown).forEach(([k, v]) => {
                    fullText += `| ${k.replace(/_/g, " ")} | ${v} |\n`;
                  });
                } else if (data.result && !data.result.error) {
                  Object.entries(data.result).forEach(([k, v]) => {
                    if (k !== "note") fullText += `- **${k.replace(/_/g, " ")}**: ${v}\n`;
                  });
                  if (data.result.note) fullText += `\n> ${data.result.note}\n`;
                }
                fullText += "\n---\n\n";
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              } else if (data.type === "error") {
                fullText += `\n\n${t("common.error")}: ${data.message}`;
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: t("chat.connection_error") };
        return u;
      });
    }

    setMessages(prev => {
      const u = [...prev];
      const last = u[u.length - 1];
      if (last?.role === "assistant") u[u.length - 1] = { ...last, timestamp: Date.now() };
      return u;
    });
    setLoading(false);
    setSearching(false);
  };

  const onRetry = () => {
    if (messages.length < 2 || loading) return;
    const lastUser = messages[messages.length - 2];
    if (lastUser.role !== "user") return;
    retryRef.current = { text: lastUser.content };
    setMessages(messages.slice(0, -2));
  };

  const handleCopy = () => {};
  const handleEnhance = async () => {
    const result = await enhance(input);
    if (result) setInput(result);
  };

  /* ═══ WELCOME STATE ═══ */
  if (messages.length === 0) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: isMobile ? "calc(100vh - 52px)" : "calc(100vh - 60px)",
        padding: isMobile ? "0 20px 120px" : "0 32px 120px",
        paddingTop: isMobile ? "8vh" : "clamp(60px, 12vh, 140px)",
        width: "100%",
        position: "relative",
      }}>
        {/* ===== HERO HEADER — matches WelcomeScreen ===== */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 16 : 24,
        }}>
          <div style={{
            width: isMobile ? 44 : 72,
            height: isMobile ? 44 : 72,
            borderRadius: isMobile ? 14 : 20,
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Globe size={isMobile ? 22 : 36} style={{ color: "#10B981" }} />
          </div>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 28 : "clamp(32px, 3vw, 48px)",
            fontWeight: 800,
            letterSpacing: "clamp(6px, 0.6vw, 10px)",
            color: "var(--text-primary)",
          }}>
            GLOBAL OPS
          </span>
        </div>
        <p style={{
          textAlign: "center",
          fontSize: 14,
          color: "var(--text-tertiary)",
          marginBottom: isMobile ? "clamp(24px, 4vh, 40px)" : "clamp(32px, 6vh, 60px)",
          maxWidth: 500,
        }}>
          Expand anywhere — understand any market before you enter
        </p>

        <div style={{
          width: "100%",
          maxWidth: isMobile ? 680 : "clamp(600px, 52vw, 820px)",
        }}>

        {/* ===== INPUT PRINCIPAL ===== */}
        <div style={{ width: "100%", marginBottom: 16 }}>
          <div style={{
            borderRadius: 14,
            border: `1px solid rgba(139,92,246,0.2)`,
            background: "var(--card-bg)", overflow: "hidden",
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); handleEnhance(); return; }
                if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="I want to expand my SaaS business to South Korea..."
              rows={isMobile ? 2 : 3}
              style={{
                width: "100%", padding: "14px 16px 6px",
                background: "transparent", border: "none",
                color: "var(--text-primary)", fontSize: 14,
                lineHeight: 1.6, resize: "none", outline: "none",
                fontFamily: "var(--font-body)",
              }}
            />
            <div style={{
              display: "flex", alignItems: "center", padding: "6px 12px 8px", gap: 6,
            }}>
              {input.trim().length >= 10 && (
                <button onClick={handleEnhance} disabled={enhancing} title="Enhance (\u2318E)" style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 50,
                  border: "1px solid var(--border-secondary)",
                  background: wasEnhanced ? "rgba(139,92,246,0.08)" : "transparent",
                  color: wasEnhanced ? PURPLE : "var(--text-tertiary)", fontSize: 11,
                  cursor: enhancing ? "wait" : "pointer", transition: "all 200ms",
                  fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                }}>
                  {enhancing ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={11} />}
                  {wasEnhanced ? "Enhanced" : "Enhance"}
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 18px", borderRadius: 50,
                  background: input.trim() ? PURPLE : "rgba(255,255,255,0.04)",
                  color: input.trim() ? "#fff" : "var(--text-tertiary)",
                  fontSize: 12, fontWeight: 700, border: "none",
                  cursor: input.trim() ? "pointer" : "default",
                  opacity: input.trim() ? 1 : 0.4,
                  transition: "all 300ms ease",
                }}
              >
                <Plane size={12} /> Analyze market
              </button>
            </div>
          </div>
        </div>

        {/* ===== REGION QUICK SELECT ===== */}
        <div style={{ width: "100%", marginBottom: 20 }}>
          <span style={{
            fontSize: 10, color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)", letterSpacing: 0.5,
            textTransform: "uppercase",
          }}>
            Quick region select
          </span>
          <div className="globalops-region-pills" style={{
            display: "flex", gap: 6, marginTop: 8,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : undefined,
            WebkitOverflowScrolling: "touch" as any,
            scrollbarWidth: "none" as any,
            paddingBottom: isMobile ? 4 : 0,
          }}>
            {REGIONS.map((r) => (
              <button key={r.value} onClick={() => {
                setSelectedRegion(prev => {
                  if (prev === r.value) return null;
                  if (!input.trim()) setInput(`I want to expand my business to ${r.region}`);
                  return r.value;
                });
              }} style={{
                padding: "6px 12px", borderRadius: 50,
                border: `1px solid ${selectedRegion === r.value ? "rgba(139,92,246,0.4)" : "var(--border-secondary)"}`,
                background: selectedRegion === r.value ? "rgba(139,92,246,0.08)" : "transparent",
                color: selectedRegion === r.value ? PURPLE : "var(--text-secondary)",
                fontSize: 11, cursor: "pointer", transition: "all 150ms",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {r.emoji} {r.region}
              </button>
            ))}
          </div>
        </div>

        {/* ===== ANALYSIS CATEGORIES ===== */}
        <div style={{ width: "100%" }}>
          <span style={{
            fontSize: 10, color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)", letterSpacing: 0.5,
            textTransform: "uppercase",
          }}>
            Or choose an analysis type
          </span>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 8, marginTop: 8,
          }}>
            {ANALYSIS_TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <button key={i} onClick={() => setInput(tool.prompt)}
                  className="interactive-card"
                  style={{
                    display: "flex", flexDirection: "column",
                    padding: "14px 16px", borderRadius: 12,
                    border: "1px solid var(--border-secondary)",
                    background: "var(--card-bg)", textAlign: "left",
                    cursor: "pointer", gap: 8,
                    transition: "border-color 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: PURPLE,
                  }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                      {tool.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                      {tool.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== DISCLAIMER ===== */}
        <p style={{
          textAlign: "center", fontSize: 10,
          color: "var(--text-tertiary)", opacity: 0.3,
          marginTop: 20,
        }}>
          Always verify international regulations with qualified legal professionals.
        </p>
        </div>
      </div>
    );
  }

  /* ═══ CHAT STATE ═══ */
  return (
    <>
      <div
        ref={areaRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: "auto", display: "flex", flexDirection: "column",
          position: "relative", userSelect: "none", WebkitUserSelect: "none" as any,
        }}
      >
        {/* Mode breadcrumb */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: isMobile ? "8px 16px" : "8px 24px",
          fontSize: 10, color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono)", letterSpacing: 0.5,
        }}>
          <Globe size={10} style={{ color: PURPLE }} />
          GLOBAL OPS
        </div>

        <div style={{ width: "100%", maxWidth: "clamp(600px, 52vw, 820px)", margin: "0 auto", padding: "4px 24px 120px" }}>
          {messages.map((m, i) => (
            <MessageBlock
              key={i}
              message={m}
              index={i}
              isLast={i === messages.length - 1}
              loading={loading}
              searching={searching}
              userInitials={userInitials}
              onRetry={i === messages.length - 1 ? onRetry : undefined}
              onCopy={handleCopy}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {userScrolledUp && (
          <button
            onClick={scrollToBottom}
            style={{
              position: "sticky", bottom: 16, alignSelf: "center",
              padding: "6px 14px", borderRadius: 20,
              background: "var(--bg-primary)", border: "1px solid var(--border-primary)",
              color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
              boxShadow: "var(--shadow-md)", zIndex: 5,
              display: "flex", alignItems: "center", gap: 4,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <ArrowDown size={12} />
          </button>
        )}
      </div>

      {/* Fixed input at bottom */}
      <div style={{ flexShrink: 0, background: "var(--bg-primary)", position: "relative" }}>
        <div style={{
          position: "absolute",
          top: -32, left: 0, right: 0, height: 32,
          background: "linear-gradient(to bottom, transparent, var(--bg-primary))",
          pointerEvents: "none",
        }} />
        <div style={{ padding: isMobile ? "8px 12px 16px" : "12px 24px 16px", paddingBottom: "calc(16px + var(--safe-bottom, 0px))" }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => send()}
            loading={loading}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            mode="globalops"
          />
        </div>
      </div>
      {showPaywall && (
        <div style={{
          position: "fixed", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 100,
        }}>
          <div style={{ textAlign: "center", padding: 32, maxWidth: 400 }}>
            <Lock size={32} style={{ color: PURPLE, marginBottom: 16 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Unlock Global Ops intelligence
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              Market entry strategies, regulatory scans, and cultural intelligence for 100+ countries.
            </div>
            <a href="/pricing" style={{
              display: "inline-flex", padding: "12px 28px", borderRadius: 50,
              background: PURPLE, color: "#fff", fontWeight: 600,
              fontSize: 14, textDecoration: "none",
            }}>
              {"Upgrade now \u2192"}
            </a>
            <button onClick={() => setShowPaywall(false)} style={{
              display: "block", margin: "12px auto 0", background: "none",
              border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
            }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
