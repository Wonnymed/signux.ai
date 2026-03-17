"use client";
import { t } from "../lib/i18n";
import ChatInput from "./ChatInput";

const SUGGESTION_KEYS = ["suggestion.1", "suggestion.2", "suggestion.3", "suggestion.4"];

type WelcomeScreenProps = {
  profileName: string;
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  loading: boolean;
};

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "chat.greeting_morning";
  if (hour >= 12 && hour < 18) return "chat.greeting_afternoon";
  return "chat.greeting_evening";
}

export default function WelcomeScreen({ profileName, input, setInput, onSend, loading }: WelcomeScreenProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1,
      maxWidth: 680, margin: "0 auto", width: "100%", padding: "24px 24px 32px",
    }}>
      {/* Time-based greeting — and nothing else */}
      <div style={{
        fontSize: 28, fontWeight: 400, color: "var(--text-primary)",
        marginBottom: 40, animation: "fadeIn 0.4s ease-out",
      }}>
        {t(getGreetingKey(), { name: profileName })}
      </div>

      {/* Input */}
      <div style={{ width: "100%", marginBottom: 16 }}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => onSend()}
          loading={loading}
          showDisclaimer={false}
        />
      </div>

      {/* Suggestion chips — horizontal row below input */}
      <div
        style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          justifyContent: "center", width: "100%",
          animation: "fadeIn 0.5s ease-out",
        }}
      >
        {SUGGESTION_KEYS.map(key => (
          <button
            key={key}
            onClick={() => onSend(t(key))}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-xl)",
              background: "transparent", border: "1px solid var(--border-secondary)",
              fontSize: 13, color: "var(--text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
              whiteSpace: "nowrap",
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
