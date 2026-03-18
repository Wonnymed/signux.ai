"use client";
import { Zap, ArrowRight } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxWordmark } from "./SignuxIcon";

type WelcomeScreenProps = {
  profileName: string;
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  loading: boolean;
  attachments: FileAttachment[];
  onAttachmentsChange: (atts: FileAttachment[]) => void;
  onToast?: (msg: string, type: "success" | "error" | "info") => void;
  onSwitchToSimulate?: () => void;
};

export default function WelcomeScreen({ input, setInput, onSend, loading, attachments, onAttachmentsChange, onToast, onSwitchToSimulate }: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1,
      maxWidth: 800, margin: "0 auto", width: "100%",
      padding: isMobile ? "16px 16px 24px" : "24px 24px 32px",
    }}>
      {/* Brand — [S-icon]IGNUX AI */}
      <div style={{ marginBottom: 40, animation: "fadeIn 0.3s ease-out" }}>
        <SignuxWordmark fontSize={42} />
      </div>

      {/* Input */}
      <div style={{ width: "100%", maxWidth: 740, marginBottom: 16, animation: "fadeIn 0.5s ease-out" }}>
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

      {/* Simulate banner */}
      {onSwitchToSimulate && (
        <button
          onClick={onSwitchToSimulate}
          style={{
            width: "100%", maxWidth: 740, padding: "12px 16px",
            background: "linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))",
            border: "1px solid rgba(212,175,55,0.12)",
            borderRadius: 14, display: "flex", alignItems: "center", gap: 12,
            cursor: "pointer", transition: "all 200ms",
            animation: "fadeIn 0.6s ease-out",
            textAlign: "left",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(212,175,55,0.08)";
            e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))";
            e.currentTarget.style.borderColor = "rgba(212,175,55,0.12)";
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(212,175,55,0.1)", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Zap size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {t("sim.banner_title")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
              {t("sim.banner_subtitle")}
            </div>
          </div>
          <ArrowRight size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
        </button>
      )}
    </div>
  );
}
