"use client";
import { useState, useEffect } from "react";

const LOADING_MESSAGES: Record<string, string[]> = {
  chat: ["Thinking...", "Consulting domains...", "Formulating response..."],
  simulate: ["Building simulation...", "Assembling specialists...", "Running debate rounds...", "Generating report..."],
  build: ["Evaluating opportunity...", "Building framework...", "Preparing roadmap..."],
  grow: ["Analyzing growth levers...", "Mapping revenue paths...", "Building strategy..."],
  hire: ["Evaluating candidates...", "Assessing fit...", "Building report..."],
  protect: ["Scanning risks...", "Evaluating exposure...", "Mapping threats..."],
  compete: ["Scanning competitors...", "Cross-referencing sources...", "Analyzing patterns..."],
  research: ["Searching sources...", "Cross-referencing data...", "Synthesizing findings..."],
};

export default function LoadingOracle({ mode = "chat" }: { mode?: string }) {
  const messages = LOADING_MESSAGES[mode] || LOADING_MESSAGES.chat;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 12, padding: 24,
    }}>
      <div className="oracle-eye" />
      <span style={{
        fontSize: 12, color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)", letterSpacing: 0.5,
        transition: "opacity 200ms",
      }}>
        {messages[msgIndex]}
      </span>
    </div>
  );
}
