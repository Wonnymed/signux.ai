"use client";
import { useState } from "react";
import { ClipboardCopy, Check, RotateCcw, ThumbsUp, ThumbsDown, Sparkles, Search } from "lucide-react";
import { t } from "../lib/i18n";
import MarkdownRenderer from "./MarkdownRenderer";

type MessageBlockProps = {
  message: { role: "user" | "assistant"; content: string };
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

  const isUser = message.role === "user";
  const isStreaming = loading && isLast;
  const isEmpty = !message.content;

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: "24px 0" }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          ...(isUser
            ? { background: "var(--accent-bg)", fontSize: 10, fontWeight: 600, color: "var(--accent)" }
            : { background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-secondary)" }),
        }}>
          {isUser ? userInitials : <Sparkles size={14} />}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            {isUser ? t("common.you") : "Signux"}
          </div>

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

          {/* Actions — icons only, on hover */}
          {!isUser && !isStreaming && message.content && (
            <div style={{
              display: "flex", gap: 2, marginTop: 8,
              opacity: hovered || feedback ? 1 : 0,
              transition: "opacity 0.15s",
            }}>
              <ActionBtn
                icon={copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
                onClick={handleCopy}
                active={copied}
                activeColor="var(--success)"
              />
              {isLast && onRetry && (
                <ActionBtn icon={<RotateCcw size={16} />} onClick={onRetry} />
              )}
              <ActionBtn
                icon={<ThumbsUp size={16} />}
                onClick={() => setFeedback(f => f === "up" ? null : "up")}
                active={feedback === "up"}
                activeColor="var(--success)"
              />
              <ActionBtn
                icon={<ThumbsDown size={16} />}
                onClick={() => setFeedback(f => f === "down" ? null : "down")}
                active={feedback === "down"}
                activeColor="var(--error)"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, onClick, active, activeColor }: {
  icon: React.ReactNode; onClick: () => void; active?: boolean; activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "4px 6px", borderRadius: 6, display: "flex",
        color: active ? activeColor : "var(--text-tertiary)",
        transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}
