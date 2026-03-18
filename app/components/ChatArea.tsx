"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { ArrowDown } from "lucide-react";
import type { Message } from "../lib/types";
import { useIsMobile } from "../lib/useIsMobile";
import MessageBlock from "./MessageBlock";
import WelcomeScreen from "./WelcomeScreen";
import ChatInput, { type FileAttachment } from "./ChatInput";

type ChatAreaProps = {
  messages: Message[];
  loading: boolean;
  searching: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  profileName: string;
  onRetry: () => void;
  onCopy: (text: string) => void;
  attachments: FileAttachment[];
  onAttachmentsChange: (atts: FileAttachment[]) => void;
  onToast?: (msg: string, type: "success" | "error" | "info") => void;
  onSwitchToSimulate?: () => void;
};

export default function ChatArea({
  messages, loading, searching, input, setInput, onSend,
  profileName, onRetry, onCopy, attachments, onAttachmentsChange, onToast,
  onSwitchToSimulate,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const isMobile = useIsMobile();

  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  /* Detect manual scroll */
  const handleScroll = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const distFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
    isNearBottomRef.current = distFromBottom < 100;
    setUserScrolledUp(distFromBottom > 200);
  }, []);

  /* Smart auto-scroll: throttled with RAF for smooth streaming */
  const scrollRaf = useRef(0);
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages]);

  /* Scroll to bottom button handler */
  const scrollToBottom = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setUserScrolledUp(false);
  }, []);

  /* Welcome state */
  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <WelcomeScreen
          profileName={profileName}
          input={input}
          setInput={setInput}
          onSend={onSend}
          loading={loading}
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
          onToast={onToast}
          onSwitchToSimulate={onSwitchToSimulate}
        />
      </div>
    );
  }

  /* Chat state */
  return (
    <>
      <div
        ref={areaRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", position: "relative", userSelect: "none", WebkitUserSelect: "none" as any }}
      >
        <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", paddingTop: 20, paddingBottom: 32 }}>
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
              onCopy={onCopy}
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
      <div style={{
        flexShrink: 0,
        background: "var(--bg-primary)",
        position: "relative",
      }}>
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
            onSend={() => onSend()}
            loading={loading}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            onToast={onToast}
          />
        </div>
      </div>
    </>
  );
}
