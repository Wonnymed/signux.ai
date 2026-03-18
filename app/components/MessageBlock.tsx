"use client";
import { useState } from "react";
import { ClipboardCopy, Check, RotateCcw, ThumbsUp, ThumbsDown, Search, FileText, FileCode, X } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import type { Attachment, Message } from "../lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import { SignuxIcon } from "./SignuxIcon";
import { copyToClipboard } from "../lib/clipboard";

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

  const pad = isMobile ? "8px 12px" : "8px 24px";
  const userMaxWidth = isMobile ? "85%" : "70%";
  const aiMaxWidth = isMobile ? "90%" : "75%";

  const handleCopy = async () => {
    const ok = await copyToClipboard(message.content);
    if (ok) onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <SignuxIcon size={14} color="var(--accent)" />
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
            {/* Loading state — empty AI message */}
            {isEmpty && isStreaming && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-tertiary)" }}>
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
              <>
                {searching && isStreaming && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-tertiary)", marginBottom: 8 }}>
                    <Search size={14} className="spinner" />
                    {t("chat.searching")}
                  </div>
                )}
                <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
                {isStreaming && (
                  <span style={{
                    display: "inline-block", width: 2, height: 18,
                    background: "var(--accent)", marginLeft: 3,
                    animation: "smoothBlink 1.2s ease-in-out infinite",
                    verticalAlign: "text-bottom", borderRadius: 1, opacity: 0.8,
                  }} />
                )}
              </>
            )}
          </div>

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
