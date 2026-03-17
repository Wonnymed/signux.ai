"use client";
import { useRef, useEffect } from "react";
import { ArrowUp, Paperclip, Search } from "lucide-react";
import { t } from "../lib/i18n";

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  placeholder?: string;
  searchActive?: boolean;
  onToggleSearch?: () => void;
  showDisclaimer?: boolean;
};

export default function ChatInput({ value, onChange, onSend, loading, placeholder, searchActive, onToggleSearch, showDisclaimer = true }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const canSend = value.trim() && !loading;

  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "0 auto" }} data-tour="chat-input">
      {/* Pill container */}
      <div
        style={{
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-pill)",
          background: "var(--bg-input)",
          overflow: "hidden",
          transition: "border-color 0.15s",
        }}
      >
        {/* Textarea row */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          {/* Left toolbar icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, paddingLeft: 12, paddingBottom: 8, paddingTop: 8 }}>
            <button
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 6, borderRadius: 6, display: "flex",
                color: "var(--text-tertiary)", transition: "color 0.15s",
              }}
              aria-label="Attach file"
            >
              <Paperclip size={16} />
            </button>
            {onToggleSearch && (
              <button
                onClick={onToggleSearch}
                style={{
                  background: searchActive ? "var(--accent-bg)" : "none",
                  border: searchActive ? "1px solid var(--accent)" : "none",
                  cursor: "pointer",
                  padding: 6, borderRadius: 6, display: "flex",
                  color: searchActive ? "var(--accent)" : "var(--text-tertiary)",
                  transition: "all 0.15s",
                }}
                aria-label="Web search"
              >
                <Search size={16} />
              </button>
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={ref}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder={placeholder || t("chat.placeholder")}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "12px 8px 12px 8px",
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: 15,
              outline: "none",
              lineHeight: 1.5,
            }}
          />

          {/* Send button */}
          <div style={{ paddingRight: 8, paddingBottom: 8, paddingTop: 8 }}>
            <button
              onClick={onSend}
              disabled={!canSend}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: canSend ? "var(--text-primary)" : "var(--bg-tertiary)",
                border: "none",
                cursor: canSend ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                color: canSend ? "var(--text-inverse)" : "var(--text-tertiary)",
              }}
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      {showDisclaimer && (
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
          {t("common.disclaimer")}
        </div>
      )}
    </div>
  );
}
