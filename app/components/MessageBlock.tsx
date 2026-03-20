"use client";
import { useState, useRef, useEffect } from "react";
import { ClipboardCopy, Check, RotateCcw, ThumbsUp, ThumbsDown, Search, FileText, FileCode, X, Eye, Swords } from "lucide-react";
import { signuxFetch } from "../lib/api-client";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import type { Attachment, Message } from "../lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import { SignuxIcon } from "./SignuxIcon";
import { copyToClipboard } from "../lib/clipboard";
import { parseSignuxMetadata } from "../lib/parseMetadata";

const CODE_EXTENSIONS = [
  ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".json",
  ".java", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".sql",
  ".sh", ".bash", ".xml", ".yaml", ".yml",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function isCodeFile(name: string): boolean {
  return CODE_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
}

/* ═══ Parsers ═══ */
function parseDecision(content: string): { cleanContent: string; decision: Record<string, string> | null } {
  const match = content.match(/\[DECISION\]\n?([\s\S]*?)\[\/DECISION\]/);
  if (!match) return { cleanContent: content, decision: null };
  const cleanContent = content.replace(/\[DECISION\][\s\S]*?\[\/DECISION\]/, "").trim();
  const lines = match[1].split("\n").filter(l => l.trim());
  const decision: Record<string, string> = {};
  lines.forEach(line => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) decision[key.trim()] = rest.join(":").trim();
  });
  return { cleanContent, decision: Object.keys(decision).length > 0 ? decision : null };
}

function parseConfidence(content: string): { cleanContent: string; level: string; reason: string } {
  const match = content.match(/\[CONFIDENCE:(HIGH|MEDIUM|LOW)\|([^\]]+)\]/);
  if (!match) return { cleanContent: content, level: "", reason: "" };
  const cleanContent = content.replace(/\[CONFIDENCE:[^\]]+\]/, "").trim();
  return { cleanContent, level: match[1], reason: match[2].trim() };
}

function parseFollowups(content: string): { cleanContent: string; followups: string[] } {
  const match = content.match(/\[FOLLOWUPS\]\n?([\s\S]*?)\[\/FOLLOWUPS\]/);
  if (!match) return { cleanContent: content, followups: [] };
  const cleanContent = content.replace(/\[FOLLOWUPS\][\s\S]*?\[\/FOLLOWUPS\]/, "").trim();
  const followups = match[1]
    .split("\n")
    .map(line => line.replace(/^\d+\.\s*/, "").trim())
    .filter(line => line.length > 10);
  return { cleanContent, followups };
}

/* ═══ Plan detector ═══ */
function parsePlan(content: string): { hasPlan: boolean; planContent: string; restContent: string } {
  // Match "📋 **Analysis plan:**" followed by numbered list, ending at double newline before non-numbered content or ---
  const planRegex = /📋\s*\*?\*?Analysis plan:?\*?\*?\s*\n((?:\d+\.\s+.+\n?)+)/;
  const match = content.match(planRegex);
  if (!match) return { hasPlan: false, planContent: "", restContent: content };
  const planContent = match[1].trim();
  const restContent = content.replace(match[0], "").trim();
  return { hasPlan: true, planContent, restContent };
}

type SecondOpinion = { domain: string; color: string; analysis: string; confidence: string };

type MessageBlockProps = {
  message: Message;
  index: number;
  isLast: boolean;
  loading: boolean;
  searching: boolean;
  userInitials: string;
  onRetry?: () => void;
  onCopy: (text: string) => void;
  onSendFollowup?: (text: string) => void;
  onDecisionDetected?: (decision: Record<string, string>, confidence: string) => void;
  tier?: string;
  previousUserMessage?: string;
};

const THINKING_PHRASES = [
  "Analyzing your scenario...",
  "Consulting intelligence domains...",
  "Building analysis plan...",
  "Cross-referencing data...",
  "Running verification...",
];

export default function MessageBlock({ message, index, isLast, loading, searching, userInitials, onRetry, onCopy, onSendFollowup, onDecisionDetected, tier, previousUserMessage }: MessageBlockProps) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [domainsExpanded, setDomainsExpanded] = useState(false);
  const [secondOpinion, setSecondOpinion] = useState<SecondOpinion[] | null>(null);
  const [loadingOpinion, setLoadingOpinion] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [showWork, setShowWork] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const isMobile = useIsMobile();

  // Thinking phrase (randomized once per mount)
  const [thinkingPhrase] = useState(() => THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);

  const isUser = message.role === "user";
  const isStreaming = loading && isLast;
  const isEmpty = !message.content;

  // Parse chain: decision → confidence → followups → signux metadata
  const { cleanContent: c0, decision } = !isUser ? parseDecision(message.content) : { cleanContent: message.content, decision: null };
  const { cleanContent: c1, level: confidenceLevel, reason: confidenceReason } = !isUser ? parseConfidence(c0) : { cleanContent: c0, level: "", reason: "" };
  const { cleanContent: c2, followups } = !isUser ? parseFollowups(c1) : { cleanContent: c1, followups: [] as string[] };

  // Centralized metadata parser
  const { cleanContent: c3, metadata } = !isUser ? parseSignuxMetadata(c2) : { cleanContent: c2, metadata: { domains: [], domainCount: 0, blindspots: [], depth: 0, verification: null, worklog: null, vote: null, sentiment: null, sources: [], followups: [], timeline: [] } };
  const { domains, domainCount, blindspots, depth, verification, worklog, sentiment, sources, followups: smartFollowups } = metadata;

  // Plan detection
  const { hasPlan, planContent, restContent } = !isUser && !isStreaming ? parsePlan(c3) : { hasPlan: false, planContent: "", restContent: c3 };
  const parsedContent = hasPlan ? restContent : c3;

  const isLastAI = isLast && !isUser;

  // Notify parent about detected decisions (only once when message completes)
  const decisionNotifiedRef = useRef(false);
  useEffect(() => {
    if (decision && !isStreaming && !decisionNotifiedRef.current) {
      decisionNotifiedRef.current = true;
      onDecisionDetected?.(decision, confidenceLevel);
    }
  }, [decision, isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  const pad = isMobile ? "8px 12px" : "8px 24px";
  const userMaxWidth = isMobile ? "85%" : "70%";
  const aiMaxWidth = isMobile ? "90%" : "75%";

  const handleCopy = async () => {
    const ok = await copyToClipboard(message.content);
    if (ok) onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMaxTier = tier === "max" || tier === "founding";

  const fetchSecondOpinion = async () => {
    if (!isMaxTier) { setShowUpgradePrompt("second-opinion"); return; }
    setLoadingOpinion(true);
    try {
      const res = await signuxFetch("/api/second-opinion", {
        method: "POST",
        body: JSON.stringify({
          originalQuestion: previousUserMessage || "",
          originalAnswer: message.content?.slice(0, 500) || "",
        }),
      });
      const data = await res.json();
      if (data.opinions) setSecondOpinion(data.opinions);
    } catch { /* ignore */ }
    setLoadingOpinion(false);
  };

  const fetchChallenge = async () => {
    if (!isMaxTier) { setShowUpgradePrompt("challenge"); return; }
    setLoadingChallenge(true);
    try {
      const res = await signuxFetch("/api/challenge", {
        method: "POST",
        body: JSON.stringify({
          originalQuestion: previousUserMessage || "",
          originalAnswer: message.content?.slice(0, 1000) || "",
        }),
      });
      const data = await res.json();
      if (data.challenge) setChallenge(data.challenge);
    } catch { /* ignore */ }
    setLoadingChallenge(false);
  };

  /* ═══ USER MESSAGE ═══ */
  if (isUser) {
    return (
      <>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ display: "flex", justifyContent: "flex-end", padding: pad }}
        >
          <div style={{ maxWidth: userMaxWidth, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            {/* Attachments above text */}
            {message.attachments && message.attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, justifyContent: "flex-end" }}>
                {message.attachments.map((att, i) => (
                  att.type === "image" && att.preview ? (
                    <img
                      key={i}
                      src={att.preview}
                      alt={att.name}
                      style={{
                        maxWidth: 180, maxHeight: 180,
                        borderRadius: 14,
                        cursor: "pointer", display: "block",
                        objectFit: "cover",
                      }}
                      onClick={() => setLightboxSrc(att.preview || null)}
                    />
                  ) : (
                    <div key={i} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 10px", background: "rgba(0,0,0,0.08)",
                      borderRadius: 12, fontSize: 12,
                    }}>
                      {isCodeFile(att.name) ? <FileCode size={14} style={{ opacity: 0.6 }} /> : <FileText size={14} style={{ opacity: 0.6 }} />}
                      <span style={{ fontWeight: 500 }}>{att.name}</span>
                      <span style={{ opacity: 0.6 }}>{formatFileSize(att.size)}</span>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Bubble */}
            <div style={{
              padding: "12px 16px",
              borderRadius: "18px 18px 4px 18px",
              background: "var(--accent)",
              color: "#000",
              fontSize: 15,
              lineHeight: 1.6,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              userSelect: "text",
              WebkitUserSelect: "text" as any,
            }}>
              {message.content}
            </div>

            {/* Timestamp on hover */}
            {message.timestamp && hovered && (
              <span style={{
                fontSize: 10, color: "var(--text-tertiary)",
                marginTop: 4, fontFamily: "var(--font-mono)",
                animation: "fadeIn 0.15s ease",
              }}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* Lightbox */}
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </>
    );
  }

  /* ═══ AI MESSAGE ═══ */
  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: "flex", justifyContent: "flex-start", padding: pad, gap: 10 }}
      >
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--bg-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 2,
        }}>
          <SignuxIcon variant="gold" size={14} />
        </div>

        {/* Message column */}
        <div style={{ maxWidth: aiMaxWidth, minWidth: 0 }}>
          {/* Bubble */}
          <div style={{
            padding: "12px 16px",
            borderRadius: "4px 18px 18px 18px",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            fontSize: 15,
            lineHeight: 1.7,
            wordBreak: "break-word",
            userSelect: "text",
            WebkitUserSelect: "text" as any,
            transition: "all 0.3s ease",
          }}>
            {/* Loading state — thinking indicator */}
            {isEmpty && isStreaming && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "2px 0",
                animation: "fadeIn 300ms ease",
              }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "var(--accent)",
                      animation: `signuxPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {searching ? t("chat.searching") : thinkingPhrase}
                </span>
              </div>
            )}

            {/* Message content */}
            {message.content && (
              <>
                {searching && isStreaming && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-tertiary)", marginBottom: 8 }}>
                    <Search size={14} className="spinner" />
                    {t("chat.searching")}
                  </div>
                )}

                {/* Plan box (only when not streaming) */}
                {hasPlan && !isStreaming && (
                  <div style={{
                    padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                    background: "rgba(212,175,55,0.04)",
                    border: "1px solid rgba(212,175,55,0.12)",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
                      fontSize: 11, fontWeight: 600, color: "var(--accent)",
                      fontFamily: "var(--font-mono)", letterSpacing: 1,
                      textTransform: "uppercase",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                      Analysis plan
                    </div>
                    <div style={{
                      fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}>
                      {planContent}
                    </div>
                  </div>
                )}

                <MarkdownRenderer content={isStreaming ? message.content : parsedContent} isStreaming={isStreaming} />
                {isStreaming && (
                  <span style={{
                    display: "inline-block", width: 2, height: 18,
                    background: "var(--accent)", marginLeft: 3,
                    animation: "smoothBlink 1.2s ease-in-out infinite",
                    verticalAlign: "text-bottom", borderRadius: 1, opacity: 0.8,
                  }} />
                )}
                {/* Confidence badge */}
                {!isStreaming && confidenceLevel && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 10,
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: 0.5,
                      cursor: "default",
                      background: confidenceLevel === "HIGH" ? "rgba(34,197,94,0.08)" :
                                  confidenceLevel === "MEDIUM" ? "rgba(245,158,11,0.08)" :
                                  "rgba(239,68,68,0.08)",
                      color: confidenceLevel === "HIGH" ? "#22c55e" :
                             confidenceLevel === "MEDIUM" ? "#f59e0b" :
                             "#ef4444",
                      border: `1px solid ${confidenceLevel === "HIGH" ? "rgba(34,197,94,0.15)" :
                               confidenceLevel === "MEDIUM" ? "rgba(245,158,11,0.15)" :
                               "rgba(239,68,68,0.15)"}`,
                    }}
                    title={confidenceReason}
                  >
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: confidenceLevel === "HIGH" ? "#22c55e" :
                                  confidenceLevel === "MEDIUM" ? "#f59e0b" : "#ef4444",
                    }} />
                    {confidenceLevel.toLowerCase()} confidence
                  </div>
                )}
                {/* Decision tracked badge */}
                {!isStreaming && decision && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "rgba(168,85,247,0.06)",
                    border: "1px solid rgba(168,85,247,0.12)",
                    fontSize: 11,
                    color: "#A855F7",
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    Decision tracked — we&apos;ll follow up in 30 days
                  </div>
                )}
                {/* Domain activation badge */}
                {!isStreaming && domains.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={() => setDomainsExpanded(p => !p)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 10px", borderRadius: 6,
                        background: "rgba(212,175,55,0.06)",
                        border: "1px solid rgba(212,175,55,0.15)",
                        cursor: "pointer", fontSize: 10,
                        fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                        color: "#D4AF37", transition: "all 150ms",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      {domainCount} intelligence {domainCount === 1 ? "domain" : "domains"} activated
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transform: domainsExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}>
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>
                    {domainsExpanded && (
                      <div style={{
                        display: "flex", flexWrap: "wrap", gap: 4,
                        marginTop: 6, animation: "fadeIn 0.15s ease",
                      }}>
                        {domains.map(d => (
                          <span key={d} style={{
                            padding: "2px 8px", borderRadius: 4,
                            fontSize: 9, fontFamily: "var(--font-mono)",
                            letterSpacing: 0.3,
                            background: "rgba(212,175,55,0.08)",
                            border: "1px solid rgba(212,175,55,0.12)",
                            color: "#D4AF37",
                          }}>
                            {d.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Intelligence depth bar */}
                {!isStreaming && depth > 10 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 10, color: "var(--text-tertiary)",
                    }}>
                      <span style={{ fontFamily: "var(--font-mono)" }}>Intelligence depth:</span>
                      <div style={{
                        flex: 1, maxWidth: 120, height: 4, borderRadius: 2,
                        background: "var(--border-secondary)",
                      }}>
                        <div style={{
                          height: "100%", borderRadius: 2,
                          width: `${Math.min(depth, 100)}%`,
                          background: depth >= 70 ? "#22c55e" : depth >= 40 ? "#f59e0b" : "var(--text-tertiary)",
                          transition: "width 500ms ease",
                        }} />
                      </div>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontWeight: 600,
                        color: depth >= 70 ? "#22c55e" : depth >= 40 ? "#f59e0b" : "var(--text-tertiary)",
                      }}>
                        {depth}%
                      </span>
                    </div>
                    {depth < 70 && (
                      <div style={{
                        fontSize: 10, color: "var(--text-tertiary)", marginTop: 2,
                        fontStyle: "italic", opacity: 0.6,
                      }}>
                        Add more context to activate deeper intelligence
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ═══ VERIFICATION — Confidence bar ═══ */}
          {!isStreaming && verification && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 11, color: "var(--text-tertiary)",
              }}>
                <span style={{ fontFamily: "var(--font-mono)" }}>Confidence:</span>
                <div style={{
                  flex: 1, maxWidth: 100, height: 4, borderRadius: 2,
                  background: "var(--border-secondary)",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${Math.min(verification.confidence * 100, 100)}%`,
                    background: verification.confidence >= 0.8 ? "#22c55e"
                      : verification.confidence >= 0.6 ? "#f59e0b"
                      : "#ef4444",
                    transition: "width 500ms ease",
                  }} />
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)", fontWeight: 600,
                  color: verification.confidence >= 0.8 ? "#22c55e"
                    : verification.confidence >= 0.6 ? "#f59e0b"
                    : "#ef4444",
                }}>
                  {Math.round(verification.confidence * 100)}%
                </span>
              </div>

              <button
                onClick={() => setShowVerification(!showVerification)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  marginTop: 4, background: "none", border: "none",
                  cursor: "pointer", fontSize: 10, color: "var(--text-tertiary)",
                  padding: 0,
                }}
              >
                {showVerification ? "Hide" : "Show"} verification details
                <span style={{ fontSize: 8, transition: "transform 200ms", transform: showVerification ? "rotate(180deg)" : "none" }}>&#9660;</span>
              </button>

              {showVerification && (
                <div style={{
                  marginTop: 6, padding: "8px 12px", borderRadius: 8,
                  background: "var(--bg-tertiary)", fontSize: 11,
                  animation: "fadeIn 0.15s ease",
                }}>
                  {verification.checked && verification.checked.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ color: "#22c55e", fontWeight: 600 }}>Verified:</span>
                      <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>
                        {verification.checked.map((c, i) => (
                          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ color: "#22c55e", fontSize: 10 }}>&#10003;</span> {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {verification.caveats && verification.caveats.length > 0 && (
                    <div>
                      <span style={{ color: "#f59e0b", fontWeight: 600 }}>Caveats:</span>
                      <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>
                        {verification.caveats.map((c, i) => (
                          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ color: "#f59e0b", fontSize: 10 }}>&#9888;</span> {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ WORKLOG — Show my work ═══ */}
          {!isStreaming && worklog && worklog.steps && worklog.steps.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowWork(!showWork)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 50,
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)",
                  cursor: "pointer", fontSize: 11, color: "var(--text-tertiary)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Show my work ({worklog.reasoning_steps || worklog.steps.length} steps)
                <span style={{ fontSize: 8, transition: "transform 200ms", transform: showWork ? "rotate(180deg)" : "none" }}>&#9660;</span>
              </button>

              {showWork && (
                <div style={{
                  marginTop: 8, padding: "12px 14px", borderRadius: 10,
                  border: "1px solid var(--border-secondary)",
                  background: "var(--bg-tertiary)",
                  animation: "fadeIn 0.15s ease",
                }}>
                  <div style={{
                    fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1,
                    textTransform: "uppercase", color: "var(--text-tertiary)",
                    marginBottom: 8, opacity: 0.5,
                  }}>
                    Reasoning trace
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {worklog.steps.map((step, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 8, alignItems: "flex-start",
                        fontSize: 12,
                      }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: "rgba(212,175,55,0.1)",
                          color: "var(--accent)", fontSize: 9, fontWeight: 600,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1,
                        }}>
                          {i + 1}
                        </span>
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {step.action}
                          </span>
                          {step.detail && (
                            <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>
                              — {step.detail}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary stats */}
                  <div style={{
                    display: "flex", gap: 12, marginTop: 10, paddingTop: 8,
                    borderTop: "1px solid var(--border-secondary)",
                    fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)",
                  }}>
                    {worklog.domains_used > 0 && <span>{worklog.domains_used} domains</span>}
                    {worklog.sources_count > 0 && <span>{worklog.sources_count} sources</span>}
                    {worklog.reasoning_steps > 0 && <span>{worklog.reasoning_steps} steps</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Blind spot detector */}
          {!isStreaming && blindspots.length > 0 && isLastAI && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 6,
              marginTop: 10, maxWidth: "100%",
            }}>
              <div style={{
                fontSize: 10, color: "#ef4444",
                fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                display: "flex", alignItems: "center", gap: 4, marginBottom: 2,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M2.73 17.52 10.56 3.44a1.65 1.65 0 0 1 2.88 0l7.83 14.08A1.65 1.65 0 0 1 19.86 20H4.14a1.65 1.65 0 0 1-1.41-2.48Z"/></svg>
                Blind spots detected
              </div>
              {blindspots.map((bs, i) => (
                <button
                  key={i}
                  onClick={() => onSendFollowup?.(bs.question)}
                  style={{
                    display: "flex", flexDirection: "column", gap: 4,
                    padding: "8px 12px", borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.12)",
                    background: "rgba(239,68,68,0.03)",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.12)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.03)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      padding: "1px 6px", borderRadius: 3, fontSize: 8,
                      fontFamily: "var(--font-mono)", letterSpacing: 0.3,
                      background: "rgba(239,68,68,0.08)", color: "#ef4444",
                    }}>
                      {bs.domain.replace(/_/g, " ")}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3, marginLeft: "auto", flexShrink: 0 }}><path d="m5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {bs.question}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.3 }}>
                    {bs.why}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ═══ SENTIMENT BADGE ═══ */}
          {!isStreaming && sentiment && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 8, padding: "4px 10px", borderRadius: 50,
              background: sentiment.signal === "bullish" ? "rgba(34,197,94,0.08)"
                : sentiment.signal === "bearish" ? "rgba(239,68,68,0.08)"
                : sentiment.signal === "mixed" ? "rgba(245,158,11,0.08)"
                : "rgba(148,163,184,0.08)",
              border: `1px solid ${
                sentiment.signal === "bullish" ? "rgba(34,197,94,0.2)"
                : sentiment.signal === "bearish" ? "rgba(239,68,68,0.2)"
                : sentiment.signal === "mixed" ? "rgba(245,158,11,0.2)"
                : "rgba(148,163,184,0.2)"
              }`,
            }}>
              <span style={{ fontSize: 12 }}>
                {sentiment.signal === "bullish" ? "\u25B2" : sentiment.signal === "bearish" ? "\u25BC" : sentiment.signal === "mixed" ? "\u25C6" : "\u25CF"}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
                color: sentiment.signal === "bullish" ? "#22c55e"
                  : sentiment.signal === "bearish" ? "#ef4444"
                  : sentiment.signal === "mixed" ? "#f59e0b"
                  : "#94a3b8",
              }}>
                {sentiment.signal}
              </span>
              <span style={{
                fontSize: 10, color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
              }}>
                {Math.round(sentiment.confidence * 100)}%
              </span>
              {sentiment.reason && (
                <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: 2 }}>
                  — {sentiment.reason}
                </span>
              )}
            </div>
          )}

          {/* ═══ SOURCE CARDS ═══ */}
          {!isStreaming && sources.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowSources(!showSources)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 50,
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)",
                  cursor: "pointer", fontSize: 11, color: "var(--text-tertiary)",
                }}
              >
                <FileText size={12} />
                {sources.length} source{sources.length > 1 ? "s" : ""} used
                <span style={{ fontSize: 8, transition: "transform 200ms", transform: showSources ? "rotate(180deg)" : "none" }}>&#9660;</span>
              </button>

              {showSources && (
                <div style={{
                  marginTop: 6, display: "flex", flexDirection: "column", gap: 4,
                  animation: "fadeIn 0.15s ease",
                }}>
                  {sources.map((src, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "8px 12px", borderRadius: 8,
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-secondary)",
                      fontSize: 12,
                    }}>
                      <span style={{
                        padding: "1px 5px", borderRadius: 3, fontSize: 9,
                        fontFamily: "var(--font-mono)", letterSpacing: 0.3,
                        background: src.type === "web" ? "rgba(59,130,246,0.1)" : src.type === "kb" ? "rgba(212,175,55,0.1)" : src.type === "framework" ? "rgba(168,85,247,0.1)" : "rgba(148,163,184,0.1)",
                        color: src.type === "web" ? "#3b82f6" : src.type === "kb" ? "var(--accent)" : src.type === "framework" ? "#a855f7" : "#94a3b8",
                        flexShrink: 0, marginTop: 1,
                      }}>
                        {src.type}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{src.title}</div>
                        {src.relevance && (
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{src.relevance}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ SMART FOLLOW-UPS (from metadata) ═══ */}
          {!isStreaming && smartFollowups.length > 0 && isLastAI && (
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6,
              marginTop: 10,
            }}>
              <div style={{
                width: "100%", fontSize: 10, color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                display: "flex", alignItems: "center", gap: 4, marginBottom: 2,
              }}>
                <Search size={10} />
                Explore deeper
              </div>
              {smartFollowups.map((sf, i) => (
                <button
                  key={i}
                  onClick={() => onSendFollowup?.(sf.question)}
                  title={sf.why}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 50,
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)",
                    cursor: "pointer", fontSize: 11,
                    color: "var(--text-secondary)",
                    transition: "all 150ms",
                    maxWidth: "100%",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.background = "var(--card-hover-bg)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--card-border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--card-bg)";
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sf.question}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.3 }}><path d="m5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              ))}
            </div>
          )}

          {/* Actions — below bubble */}
          {!isStreaming && message.content && (
            <div style={{
              display: "flex", gap: 2, marginTop: 4,
              opacity: isMobile || hovered || feedback ? 1 : 0,
              transition: "opacity 0.15s",
              userSelect: "none", WebkitUserSelect: "none" as any,
            }}>
              <Tooltip label="Copy response">
                <ActionBtn
                  icon={copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                  onClick={handleCopy}
                  active={copied}
                  activeColor="var(--success)"
                />
              </Tooltip>
              {isLast && onRetry && (
                <Tooltip label="Retry">
                  <ActionBtn icon={<RotateCcw size={14} />} onClick={onRetry} />
                </Tooltip>
              )}
              <Tooltip label="Good response">
                <ActionBtn
                  icon={<ThumbsUp size={14} />}
                  onClick={() => setFeedback(f => f === "up" ? null : "up")}
                  active={feedback === "up"}
                  activeColor="var(--success)"
                />
              </Tooltip>
              <Tooltip label="Bad response">
                <ActionBtn
                  icon={<ThumbsDown size={14} />}
                  onClick={() => setFeedback(f => f === "down" ? null : "down")}
                  active={feedback === "down"}
                  activeColor="var(--error)"
                />
              </Tooltip>
              {parsedContent.length > 100 && (
                <>
                  <button
                    onClick={fetchSecondOpinion}
                    disabled={loadingOpinion}
                    title="See this from 3 different intelligence perspectives"
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 6,
                      border: isMaxTier ? "1px solid rgba(168,85,247,0.3)" : "1px solid var(--border-secondary)",
                      background: loadingOpinion ? "var(--bg-tertiary)" : "transparent",
                      cursor: loadingOpinion ? "wait" : "pointer",
                      fontSize: 11, color: isMaxTier ? "#A855F7" : "var(--text-tertiary)",
                      transition: "all 200ms",
                    }}
                  >
                    <Eye size={12} />
                    {loadingOpinion ? "Analyzing..." : "Second opinion"}
                    {!isMaxTier && <span style={{ fontSize: 8, fontWeight: 700, color: "#A855F7", letterSpacing: 0.5 }}>MAX</span>}
                  </button>
                  <button
                    onClick={fetchChallenge}
                    disabled={loadingChallenge}
                    title="Find weaknesses in this analysis"
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 6,
                      border: isMaxTier ? "1px solid rgba(168,85,247,0.3)" : "1px solid var(--border-secondary)",
                      background: loadingChallenge ? "var(--bg-tertiary)" : "transparent",
                      cursor: loadingChallenge ? "wait" : "pointer",
                      fontSize: 11, color: isMaxTier ? "#A855F7" : "var(--text-tertiary)",
                      transition: "all 200ms",
                    }}
                  >
                    <Swords size={12} />
                    {loadingChallenge ? "Challenging..." : "Challenge this"}
                    {!isMaxTier && <span style={{ fontSize: 8, fontWeight: 700, color: "#A855F7", letterSpacing: 0.5 }}>MAX</span>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Upgrade prompt */}
          {showUpgradePrompt && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginTop: 8,
              background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)",
              fontSize: 12, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {showUpgradePrompt === "second-opinion"
                  ? "Second Opinion is exclusive to Max — 3 perspectives on every answer"
                  : "Challenge This is exclusive to Max — stress-test any analysis"}
              </span>
              <a href="/pricing" style={{
                padding: "4px 12px", borderRadius: 50, background: "var(--accent)",
                color: "#000", fontSize: 11, fontWeight: 600, textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                Upgrade
              </a>
              <button onClick={() => setShowUpgradePrompt(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-tertiary)", fontSize: 12, padding: 0,
              }}>&#10005;</button>
            </div>
          )}

          {/* Second Opinion panel */}
          {secondOpinion && (
            <div style={{
              marginTop: 12, border: "1px solid var(--border-secondary)",
              borderRadius: 12, overflow: "hidden",
            }}>
              <div style={{
                padding: "8px 14px", background: "var(--bg-tertiary)",
                fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border-secondary)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>3 intelligence perspectives</span>
                <button onClick={() => setSecondOpinion(null)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-tertiary)", fontSize: 14, padding: 0,
                }}>&#10005;</button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                minHeight: 0,
              }}>
                {secondOpinion.map((op, i) => (
                  <div key={i} style={{
                    padding: "12px 14px",
                    borderRight: !isMobile && i < 2 ? "1px solid var(--border-secondary)" : "none",
                    borderBottom: isMobile && i < 2 ? "1px solid var(--border-secondary)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: op.color }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: op.color }}>{op.domain}</span>
                    </div>
                    <div style={{
                      fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                      maxHeight: 180, overflowY: "auto",
                    }}>
                      {op.analysis}
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: 10, fontFamily: "var(--font-mono)",
                      color: op.confidence === "HIGH" ? "#22c55e" : op.confidence === "LOW" ? "#ef4444" : "#f59e0b",
                    }}>
                      Confidence: {op.confidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenge panel */}
          {challenge && (
            <div style={{
              marginTop: 12, padding: "14px 16px", borderRadius: 12,
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.15)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", display: "flex", alignItems: "center", gap: 6 }}>
                  <Swords size={14} /> Devil&apos;s Advocate
                </span>
                <button onClick={() => setChallenge(null)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-tertiary)", fontSize: 14, padding: 0,
                }}>&#10005;</button>
              </div>
              <div style={{
                fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {challenge}
              </div>
            </div>
          )}

          {/* Timestamp on hover */}
          {message.timestamp && hovered && !isStreaming && (
            <span style={{
              fontSize: 10, color: "var(--text-tertiary)",
              marginTop: 2, display: "block",
              fontFamily: "var(--font-mono)",
              animation: "fadeIn 0.15s ease",
            }}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {/* Follow-up suggestions — only on last AI message */}
          {followups.length > 0 && isLastAI && !isStreaming && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 10,
              maxWidth: "100%",
            }}>
              <div style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                letterSpacing: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 2,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547Z"/></svg>
                You might also want to ask
              </div>
              {followups.map((fq, i) => (
                <button
                  key={i}
                  onClick={() => onSendFollowup?.(fq)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 150ms",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.background = "var(--card-hover-bg)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--card-border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--card-bg)";
                  }}
                >
                  <span style={{ flex: 1 }}>{fq}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.3 }}><path d="m5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

/* ═══ Lightbox ═══ */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.8)", display: "flex",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", animation: "fadeIn 0.15s ease",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close image"
        style={{
          position: "absolute", top: 20, right: 20,
          background: "none", border: "none", color: "#fff",
          cursor: "pointer", display: "flex",
        }}
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt="Full size"
        style={{
          maxWidth: "90vw", maxHeight: "90vh",
          borderRadius: "var(--radius-md)",
          objectFit: "contain",
        }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

/* ═══ Tooltip ═══ */
function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [show, setShow] = useState(false);

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: 6,
          padding: "5px 10px",
          background: "var(--text-primary)",
          color: "var(--bg-primary)",
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 6,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 100,
        }}>
          {label}
          <div style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid var(--text-primary)",
          }} />
        </div>
      )}
    </div>
  );
}

/* ═══ Action Button ═══ */
function ActionBtn({ icon, onClick, active, activeColor }: {
  icon: React.ReactNode; onClick: () => void; active?: boolean; activeColor?: string;
}) {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setBtnHovered(true)}
      onMouseLeave={() => setBtnHovered(false)}
      style={{
        background: btnHovered ? "var(--bg-hover)" : "none",
        border: "none", cursor: "pointer",
        padding: "4px 6px", borderRadius: 6, display: "flex",
        alignItems: "center", justifyContent: "center",
        minWidth: 32, minHeight: 32,
        color: active ? activeColor : btnHovered ? "var(--text-secondary)" : "var(--text-tertiary)",
        transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}
