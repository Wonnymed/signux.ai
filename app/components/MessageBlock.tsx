"use client";
import { useState } from "react";
import { ClipboardCopy, Check, RotateCcw, ThumbsUp, ThumbsDown, Search, FileText, FileCode, X } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import type { Attachment, Message } from "../lib/types";
import MarkdownRenderer from "./MarkdownRenderer";

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

type MessageBlockProps = {
  message: Message;
  index: number;
  isLast: boolean;
  loading: boolean;
  searching: boolean;
  userInitials: string;
  onRetry?: () => void;
  onCopy: (text: string) => void;
};

export default function MessageBlock({ message, index, isLast, loading, searching, userInitials, onRetry, onCopy }: MessageBlockProps) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const isUser = message.role === "user";
  const isStreaming = loading && isLast;
  const isEmpty = !message.content;

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ padding: "20px 0" }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", padding: isMobile ? "0 16px" : "0 24px" }}>
          {/* Sender label + timestamp on hover */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.02em" }}>
              {isUser ? t("common.you") : "Signux"}
            </span>
            {message.timestamp && (
              <span style={{
                fontSize: 11, color: "var(--text-tertiary)",
                opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
                fontFamily: "var(--font-mono)",
              }}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* Attachment display */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {message.attachments.map((att, i) => (
                att.type === "image" && att.preview ? (
                  <img
                    key={i}
                    src={att.preview}
                    alt={att.name}
                    style={{
                      maxWidth: 200, maxHeight: 200,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer", display: "block",
                      objectFit: "cover",
                    }}
                    onClick={() => setLightboxSrc(att.preview || null)}
                  />
                ) : (
                  <div key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                    borderRadius: "var(--radius-sm)",
                  }}>
                    {isCodeFile(att.name) ? <FileCode size={16} style={{ color: "var(--text-tertiary)" }} /> : <FileText size={16} style={{ color: "var(--text-tertiary)" }} />}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{att.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{formatFileSize(att.size)}</span>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Loading state */}
          {!isUser && isEmpty && isStreaming && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-tertiary)", marginTop: 4 }}>
              {searching ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <Search size={14} className="spinner" />
                  {t("chat.searching")}
                </span>
              ) : (
                <span className="loading-dots"><span /><span /><span /></span>
              )}
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)", wordBreak: "break-word" }}>
              {isUser ? (
                <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
              ) : (
                <>
                  {searching && isStreaming && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-tertiary)", marginBottom: 8 }}>
                      <Search size={14} className="spinner" />
                      {t("chat.searching")}
                    </div>
                  )}
                  <MarkdownRenderer content={message.content} />
                  {isStreaming && (
                    <span style={{
                      display: "inline-block", width: 2, height: 16,
                      background: "var(--text-primary)", marginLeft: 2,
                      animation: "blink 1s infinite", verticalAlign: "text-bottom",
                    }} />
                  )}
                </>
              )}
            </div>
          )}

          {/* Actions — on hover (always visible on mobile) */}
          {!isUser && !isStreaming && message.content && (
            <div style={{
              display: "flex", gap: 2, marginTop: 8,
              opacity: isMobile || hovered || feedback ? 1 : 0,
              transition: "opacity 0.15s",
            }}>
              <ActionBtn
                icon={copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                onClick={handleCopy}
                active={copied}
                activeColor="var(--success)"
                label="Copy message"
              />
              {isLast && onRetry && (
                <ActionBtn icon={<RotateCcw size={14} />} onClick={onRetry} label="Retry" />
              )}
              <ActionBtn
                icon={<ThumbsUp size={14} />}
                onClick={() => setFeedback(f => f === "up" ? null : "up")}
                active={feedback === "up"}
                activeColor="var(--success)"
                label="Good response"
              />
              <ActionBtn
                icon={<ThumbsDown size={14} />}
                onClick={() => setFeedback(f => f === "down" ? null : "down")}
                active={feedback === "down"}
                activeColor="var(--error)"
                label="Bad response"
              />
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.8)", display: "flex",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", animation: "fadeIn 0.15s ease",
          }}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "none", border: "none", color: "#fff",
              cursor: "pointer", display: "flex",
            }}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxSrc}
            alt="Full size"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: "var(--radius-md)",
              objectFit: "contain",
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function ActionBtn({ icon, onClick, active, activeColor, label }: {
  icon: React.ReactNode; onClick: () => void; active?: boolean; activeColor?: string; label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "4px 6px", borderRadius: 6, display: "flex",
        alignItems: "center", justifyContent: "center",
        minWidth: 44, minHeight: 44,
        color: active ? activeColor : "var(--text-tertiary)",
        transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}
