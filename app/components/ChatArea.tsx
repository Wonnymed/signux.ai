"use client";
import { useRef, useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { Message } from "../lib/types";
import MessageBlock from "./MessageBlock";
import WelcomeScreen from "./WelcomeScreen";
import ChatInput from "./ChatInput";

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
};

export default function ChatArea({ messages, loading, searching, input, setInput, onSend, profileName, onRetry, onCopy }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [showScroll, setShowScroll] = useState(false);

  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const onScroll = () => setShowScroll(area.scrollHeight - area.scrollTop - area.clientHeight > 200);
    area.addEventListener("scroll", onScroll);
    return () => area.removeEventListener("scroll", onScroll);
  }, [messages.length]);

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
        />
      </div>
    );
  }

  /* Chat state */
  return (
    <>
      <div ref={areaRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ width: "100%", paddingBottom: 32 }}>
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

        {showScroll && (
          <button
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
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
        <div style={{ padding: "12px 24px 16px" }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => onSend()}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}
