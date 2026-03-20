"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { ArrowDown, Square } from "lucide-react";
import type { Message, Mode } from "../lib/types";
import { useIsMobile } from "../lib/useIsMobile";
import MessageBlock from "./MessageBlock";
import WelcomeScreen from "./WelcomeScreen";
import ChatInput, { type FileAttachment } from "./ChatInput";
import LandingSections from "./LandingSections";

/* Shared content width — single source of truth for alignment */
const CONTENT_MAX_WIDTH = 720;

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
  onSwitchToResearch?: () => void;
  onSwitchMode?: (mode: Mode) => void;
  onStop?: () => void;
  onOpenThreatRadar?: () => void;
  onOpenDealXRay?: () => void;
  onOpenWarGame?: () => void;
  onOpenCausalMap?: () => void;
  onOpenScenarios?: () => void;
  lang?: string;
  mode?: string;
  onDecisionDetected?: (decision: Record<string, string>, confidence: string) => void;
  tier?: string;
};

export default function ChatArea({
  messages, loading, searching, input, setInput, onSend,
  profileName, onRetry, onCopy, attachments, onAttachmentsChange, onToast,
  onSwitchToSimulate, onSwitchToResearch, onSwitchMode, onStop, onOpenThreatRadar, onOpenDealXRay, onOpenWarGame, onOpenCausalMap, onOpenScenarios, lang, mode, onDecisionDetected, tier,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const isMobile = useIsMobile();

  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  const handleScroll = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const distFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
    isNearBottomRef.current = distFromBottom < 100;
    setUserScrolledUp(distFromBottom > 200);
  }, []);

  const scrollRaf = useRef(0);
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setUserScrolledUp(false);
  }, []);

  const hPad = isMobile ? 16 : 24;

  /* ═══ Welcome state ═══ */
  if (messages.length === 0) {
    return (
      <>
        <div className="temporal-grid" />
        <div className="prediction-horizon" />
        <div style={{ flexShrink: 0 }}>
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
            onSwitchToResearch={onSwitchToResearch}
            onSwitchMode={onSwitchMode}
            onOpenThreatRadar={onOpenThreatRadar}
            onOpenDealXRay={onOpenDealXRay}
            onOpenWarGame={onOpenWarGame}
            onOpenCausalMap={onOpenCausalMap}
            onOpenScenarios={onOpenScenarios}
            lang={lang}
          />
          <LandingSections />
        </div>
      </>
    );
  }

  /* ═══ Conversation state ═══ */
  return (
    <>
      <div className="temporal-grid" />
      <div className="prediction-horizon" />

      {/* Scrollable messages area */}
      <div
        ref={areaRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          margin: "0 auto",
          padding: `20px ${hPad}px 120px`,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
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
              onSendFollowup={(text) => onSend(text)}
              onDecisionDetected={onDecisionDetected}
              tier={tier}
              previousUserMessage={i > 0 && messages[i - 1]?.role === "user" ? messages[i - 1].content : undefined}
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

      {/* ═══ Fixed input dock ═══ */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        {/* Fade gradient */}
        <div style={{
          position: "absolute",
          top: -48, left: 0, right: 0, height: 48,
          background: "linear-gradient(to bottom, transparent, var(--bg-primary))",
          pointerEvents: "none",
        }} />

        <div style={{
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          margin: "0 auto",
          padding: `8px ${hPad}px`,
          paddingBottom: `calc(16px + var(--safe-bottom, 0px))`,
        }}>
          {loading && onStop && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <button onClick={onStop} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 16px", borderRadius: 50,
                border: "1px solid var(--border-secondary)",
                background: "var(--bg-secondary)", color: "var(--text-secondary)",
                fontSize: 12, cursor: "pointer", transition: "all 200ms",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text-tertiary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-secondary)"; }}>
                <Square size={12} fill="currentColor" /> Stop generating
              </button>
            </div>
          )}
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => onSend()}
            loading={loading}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            onToast={onToast}
            mode={mode}
          />
        </div>
      </div>
    </>
  );
}
