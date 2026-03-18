"use client";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";

const SUGGESTION_KEYS = ["suggestion.1", "suggestion.2", "suggestion.3", "suggestion.4"];

type WelcomeScreenProps = {
  profileName: string;
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  loading: boolean;
  attachments: FileAttachment[];
  onAttachmentsChange: (atts: FileAttachment[]) => void;
  onToast?: (msg: string, type: "success" | "error" | "info") => void;
};

export default function WelcomeScreen({ profileName, input, setInput, onSend, loading, attachments, onAttachmentsChange, onToast }: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1,
      maxWidth: 640, margin: "0 auto", width: "100%",
      padding: isMobile ? "16px 16px 24px" : "24px 24px 32px",
    }}>
      {/* Brand icon */}
      <div style={{ animation: "fadeIn 0.3s ease-out", marginBottom: 8 }}>
        <SignuxIcon color="var(--accent)" size={isMobile ? 48 : 64} />
      </div>

      {/* Brand name */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 6,
        animation: "fadeIn 0.4s ease-out", marginBottom: 4,
      }}>
        <span style={{
          fontFamily: "var(--font-brand)", fontSize: isMobile ? 28 : 36,
          fontWeight: 700, letterSpacing: 5, color: "var(--text-primary)",
        }}>SIGNUX</span>
        <span style={{
          fontFamily: "var(--font-brand)", fontSize: isMobile ? 28 : 36,
          fontWeight: 300, letterSpacing: 3, color: "var(--text-primary)", opacity: 0.5,
        }}>AI</span>
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: isMobile ? 14 : 15, color: "var(--text-tertiary)",
        marginBottom: isMobile ? 24 : 48,
        animation: "fadeIn 0.5s ease-out",
      }}>
        {t("chat.welcome_subtitle")}
      </div>

      {/* Input */}
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 16 }}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => onSend()}
          loading={loading}
          showDisclaimer={false}
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
          onToast={onToast}
        />
      </div>

      {/* Suggestion chips */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, auto)",
          gap: 8,
          justifyContent: isMobile ? "stretch" : "center",
          width: "100%",
          animation: "fadeIn 0.6s ease-out",
        }}
      >
        {SUGGESTION_KEYS.map(key => (
          <button
            key={key}
            onClick={() => onSend(t(key))}
            style={{
              padding: isMobile ? "10px 12px" : "8px 16px",
              borderRadius: "var(--radius-pill)",
              background: "transparent", border: "1px solid var(--border-secondary)",
              fontSize: 13, color: "var(--text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
              whiteSpace: isMobile ? "normal" : "nowrap",
              textAlign: "center", lineHeight: 1.3,
              minHeight: 44,
            }}
            className="suggestion-chip"
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--text-tertiary)" }}>
        {t("common.disclaimer")}
      </div>
    </div>
  );
}
