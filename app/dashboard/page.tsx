"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getProfile, updateProfile } from "../lib/profile";
import { t, Language } from "../lib/i18n";
import {
  IconZap, IconCopy, IconRetry, IconThumbUp, IconThumbDown, IconExport, IconPlus,
  IconChevron, IconClose, IconMenu, IconArrowUp, IconCheck, IconWarning,
  IconInfo, IconSearch, IconAgents, IconSimulate, IconDebate, IconReport,
  IconGraph, IconFile, IconLink, IconArrowDown, IconChat, IconSettings,
  SIM_STAGE_ICONS,
} from "../components/Icons";

/* ═══ Toast System ═══ */
type Toast = { id: number; message: string; type: "success" | "error" | "info"; dismissing?: boolean };
let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}${toast.dismissing ? " dismissing" : ""}`} onClick={() => onDismiss(toast.id)}>
          <span style={{ display: "flex" }}>{toast.type === "success" ? <IconCheck size={14} /> : toast.type === "error" ? <IconWarning size={14} /> : <IconInfo size={14} />}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ Keyboard Shortcuts Modal ═══ */
const SHORTCUTS = [
  { keys: ["\u2318", "K"], desc: "Focus input" },
  { keys: ["\u2318", "\u21e7", "S"], desc: "Toggle Chat / Simulate" },
  { keys: ["\u2318", "N"], desc: "New conversation" },
  { keys: ["Esc"], desc: "Close sidebar / modal" },
  { keys: ["?"], desc: "Show shortcuts" },
];

/* ═══ Agent Category Colors ═══ */
const AGENT_CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  supply: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "rgba(59,130,246,0.25)" },
  logistics: { bg: "rgba(16,185,129,0.08)", color: "#10B981", border: "rgba(16,185,129,0.25)" },
  finance: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.25)" },
  regulatory: { bg: "rgba(239,68,68,0.08)", color: "#EF4444", border: "rgba(239,68,68,0.25)" },
  market: { bg: "rgba(168,85,247,0.08)", color: "#A855F7", border: "rgba(168,85,247,0.25)" },
  legal: { bg: "rgba(236,72,153,0.08)", color: "#EC4899", border: "rgba(236,72,153,0.25)" },
  cultural: { bg: "rgba(20,184,166,0.08)", color: "#14B8A6", border: "rgba(20,184,166,0.25)" },
  operations: { bg: "rgba(99,102,241,0.08)", color: "#6366F1", border: "rgba(99,102,241,0.25)" },
};
const DEFAULT_CATEGORY_COLOR = { bg: "var(--bg-secondary)", color: "var(--text-secondary)", border: "var(--border)" };

const SUGGESTION_KEYS = [
  "suggestion.1", "suggestion.2", "suggestion.3",
  "suggestion.4", "suggestion.5", "suggestion.6",
];

const SIM_EXAMPLE_KEYS = [
  "sim.example.1", "sim.example.2", "sim.example.3",
];

const SIM_STAGE_KEYS = ["stage.0", "stage.1", "stage.2", "stage.3", "stage.4"];

const ENTITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  product: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "rgba(59,130,246,0.15)" },
  country: { bg: "rgba(16,185,129,0.08)", color: "#10B981", border: "rgba(16,185,129,0.15)" },
  company: { bg: "rgba(168,85,247,0.08)", color: "#A855F7", border: "rgba(168,85,247,0.15)" },
  market: { bg: "rgba(168,85,247,0.08)", color: "#A855F7", border: "rgba(168,85,247,0.15)" },
  regulation: { bg: "rgba(239,68,68,0.08)", color: "#EF4444", border: "rgba(239,68,68,0.15)" },
  currency: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.15)" },
  person: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "rgba(59,130,246,0.15)" },
};
const DEFAULT_ENTITY_COLOR = { bg: "var(--bg-secondary)", color: "var(--text-secondary)", border: "var(--border)" };

type Message = { role: "user" | "assistant"; content: string };

const MD_COMPONENTS = {
  h1: ({ children }: any) => <h1 style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--font-sans)", marginBottom: 12, marginTop: 16, color: "var(--text-primary)" }}>{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ fontSize: 17, fontWeight: 600, fontFamily: "var(--font-sans)", marginBottom: 10, marginTop: 14, color: "var(--text-primary)" }}>{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ fontSize: 15, fontWeight: 600, fontFamily: "var(--font-sans)", marginBottom: 8, marginTop: 12, color: "var(--text-primary)" }}>{children}</h3>,
  p: ({ children }: any) => <p style={{ marginBottom: 10, lineHeight: 1.7, fontSize: 15 }}>{children}</p>,
  ul: ({ children }: any) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
  ol: ({ children }: any) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
  li: ({ children }: any) => <li style={{ marginBottom: 6, lineHeight: 1.7, fontSize: 15 }}>{children}</li>,
  strong: ({ children }: any) => <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{children}</strong>,
  code: ({ children, className }: any) => {
    const isBlock = className?.includes("language-");
    if (isBlock) return <pre style={{ background: "var(--bg-secondary)", padding: 16, borderRadius: 8, overflow: "auto", marginBottom: 12, border: "1px solid var(--border-light)" }}><code style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{children}</code></pre>;
    return <code style={{ background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: 4, fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}>{children}</code>;
  },
  blockquote: ({ children }: any) => <blockquote style={{ borderLeft: "2px solid var(--accent-light)", paddingLeft: 16, margin: "12px 0", color: "var(--text-secondary)" }}>{children}</blockquote>,
  table: ({ children }: any) => <div style={{ overflowX: "auto", marginBottom: 12 }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table></div>,
  th: ({ children }: any) => <th style={{ textAlign: "left" as const, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", fontWeight: 500, fontSize: 12, color: "var(--text-primary)" }}>{children}</th>,
  td: ({ children }: any) => <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>{children}</td>,
};

function StageIcon({ index, size = 20 }: { index: number; size?: number }) {
  const Comp = SIM_STAGE_ICONS[index] || IconSearch;
  return <Comp size={size} />;
}

/* ═══ Main Component ═══ */
export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Language>("en");
  const [rates, setRates] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [mode, setMode] = useState<"chat" | "simulate">("chat");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simScenario, setSimScenario] = useState("");
  const [simStage, setSimStage] = useState(0);
  const [simLiveAgents, setSimLiveAgents] = useState<{ name: string; role?: string; category?: string; done: boolean }[]>([]);
  const [simTotalAgents, setSimTotalAgents] = useState(0);
  const [resultTab, setResultTab] = useState<"report" | "simulation" | "graph">("report");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [simRounds, setSimRounds] = useState(3);
  const [simFocusAreas, setSimFocusAreas] = useState<string[]>(["Cost", "Risk"]);
  const [simStarting, setSimStarting] = useState(false);
  const [simStartTime, setSimStartTime] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(tt => tt.id === id ? { ...tt, dismissing: true } : tt));
      setTimeout(() => setToasts(prev => prev.filter(tt => tt.id !== id)), 300);
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.map(tt => tt.id === id ? { ...tt, dismissing: true } : tt));
    setTimeout(() => setToasts(prev => prev.filter(tt => tt.id !== id)), 300);
  }, []);

  useEffect(() => {
    const profile = getProfile();
    if (!profile || !profile.name || !profile.email) {
      router.replace("/");
      return;
    }
    setProfileName(profile.name);
    setLang((profile.language as Language) || "en");
    setReady(true);
    fetch("/api/rates").then(r => r.json()).then(setRates).catch(() => {});
    const toastData = sessionStorage.getItem("signux_welcome_toast");
    if (toastData) {
      sessionStorage.removeItem("signux_welcome_toast");
      try {
        const { message, type } = JSON.parse(toastData);
        setTimeout(() => addToast(message, type), 300);
      } catch {}
    }
  }, [router, addToast]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
      else if (meta && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); setMode(prev => prev === "chat" ? "simulate" : "chat"); }
      else if (meta && e.key === "n") { e.preventDefault(); if (mode === "chat") { setMessages([]); } else { setSimResult(null); setSimScenario(""); setSimulating(false); } addToast(mode === "chat" ? t("sidebar.new_chat", lang) : t("sidebar.new_simulation", lang), "info"); }
      else if (e.key === "Escape") { setSidebarOpen(false); setShowShortcuts(false); }
      else if (e.key === "?" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); setShowShortcuts(prev => !prev); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, lang, addToast]);

  /* ═══ Chat ═══ */
  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, profile: getProfile(), rates }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text") {
                fullText += data.text;
                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: fullText }; return u; });
              } else if (data.type === "tool") {
                fullText += `\n\n---\n**${data.name.replace(/_/g, " ")}**\n`;
                if (data.result?.breakdown) { fullText += "\n| Item | Value |\n|---|---|\n"; Object.entries(data.result.breakdown).forEach(([k, v]) => { fullText += `| ${k.replace(/_/g, " ")} | ${v} |\n`; }); }
                else if (data.result && !data.result.error) { Object.entries(data.result).forEach(([k, v]) => { if (k !== "note") fullText += `- **${k.replace(/_/g, " ")}**: ${v}\n`; }); if (data.result.note) fullText += `\n> ${data.result.note}\n`; }
                fullText += "\n---\n\n";
                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: fullText }; return u; });
              } else if (data.type === "error") {
                fullText += `\n\n${t("common.error", lang)}: ${data.message}`;
                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: fullText }; return u; });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: t("chat.connection_error", lang) }; return u; });
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  /* ═══ Simulate ═══ */
  const simulate = async () => {
    if (!simScenario.trim()) return;
    setSimStarting(true);
    await new Promise(r => setTimeout(r, 600));
    setSimStarting(false);
    setSimulating(true);
    setSimResult(null);
    setSimLiveAgents([]);
    setSimTotalAgents(0);
    setSimStage(0);
    setResultTab("report");
    setSimStartTime(Date.now());
    setCollapsedSections({});
    setAgentFilter(null);
    setExportOpen(false);
    try {
      const res = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: simScenario, context: getProfile() }) });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "stage") setSimStage(data.stage);
            else if (data.type === "stage_done" && data.totalAgents) setSimTotalAgents(data.totalAgents);
            else if (data.type === "agent_start") setSimLiveAgents(prev => [...prev, { name: data.agentName, role: data.role, category: data.category, done: false }]);
            else if (data.type === "agent_done") setSimLiveAgents(prev => prev.map(a => a.name === data.agentName && !a.done ? { ...a, done: true } : a));
            else if (data.type === "complete") setSimResult(data.result);
            else if (data.type === "error") setSimResult({ error: data.error || "Simulation error." });
          } catch {}
        }
      }
    } catch { setSimResult({ error: "Simulation error. Try again." }); }
    setSimulating(false);
  };

  const exportReport = () => {
    if (!simResult || simResult.error) return;
    const agents = (simResult.stages?.agents || []).map((a: any) => `${a.name} \u2014 ${a.role}`).join("\n");
    const sim = (simResult.simulation || []).map((m: any) => `[${m.agentName} \u2014 Round ${m.round}]\n${m.content}`).join("\n\n---\n\n");
    const text = `SIGNUX AI \u2014 SIMULATION REPORT\n${"=".repeat(50)}\n\nDate: ${new Date().toLocaleString()}\nAgents: ${simResult.metadata?.agents_count}\nRounds: ${simResult.metadata?.rounds}\nInteractions: ${simResult.metadata?.total_interactions}\n\nAGENTS:\n${agents}\n\n${"=".repeat(50)}\n\nFULL REPORT:\n\n${simResult.report}\n\n${"=".repeat(50)}\n\nSIMULATION LOG:\n\n${sim}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `signux-simulation-${Date.now()}.txt`; a.click();
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; };

  const userInitials = profileName ? profileName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "OP";

  useEffect(() => {
    const area = messagesAreaRef.current;
    if (!area) return;
    const onScroll = () => setShowScrollBtn(area.scrollHeight - area.scrollTop - area.clientHeight > 200);
    area.addEventListener("scroll", onScroll);
    return () => area.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  if (!ready) return null;

  /* ══════════════════════════════════════════════════════ */
  /* SIMULATION RENDERER                                    */
  /* ══════════════════════════════════════════════════════ */
  const renderSimulation = () => {
    const FOCUS_OPTIONS = ["Cost", "Risk", "Timeline", "Legal", "Market"];
    const progressPct = Math.min(((simStage + 1) / 5) * 100, 100);
    const ringR = 70, ringC = 2 * Math.PI * ringR, ringOff = ringC - (progressPct / 100) * ringC;

    if (!simResult && !simulating) {
      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="sim-input-container" style={{ maxWidth: 680, width: "100%", paddingTop: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ color: "var(--accent)", animation: "accentPulse 3s ease-in-out infinite", borderRadius: "50%", display: "flex" }}><IconSimulate size={16} /></div>
              <span style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--accent)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{t("sim.title", lang)}</span>
            </div>
            <div style={{ fontSize: 32, fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Mission Briefing</div>
            <div style={{ fontSize: 14, color: "var(--text-tertiary)", lineHeight: 1.7, marginBottom: 40 }}>{t("sim.subtitle", lang)}</div>
            <div style={{ position: "relative", marginBottom: 32 }}>
              <textarea value={simScenario} onChange={e => setSimScenario(e.target.value)} placeholder={t("sim.placeholder", lang)}
                style={{ width: "100%", minHeight: 160, padding: 20, borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 14, lineHeight: 1.8, fontFamily: "var(--font-sans)", resize: "vertical", outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")} onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.examples_title", lang)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
              {SIM_EXAMPLE_KEYS.map((key, idx) => (
                <div key={key} onClick={() => setSimScenario(t(key, lang))} className="card-hover"
                  style={{ padding: "14px 18px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-light)", cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>{t(key, lang)}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 32, borderRadius: 10, border: "1px solid var(--border-light)", overflow: "hidden" }}>
              <button onClick={() => setAdvancedOpen(!advancedOpen)}
                style={{ width: "100%", padding: "12px 18px", background: "var(--bg-secondary)", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Advanced Options</span>
                <IconChevron size={14} direction={advancedOpen ? "up" : "down"} style={{ color: "var(--text-tertiary)" }} />
              </button>
              {advancedOpen && (
                <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border-light)", animation: "fadeIn 0.2s ease" }}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("sim.rounds", lang)}</span>
                      <span style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{simRounds}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setSimRounds(n)}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-mono)",
                            background: simRounds === n ? "var(--accent-light)" : "var(--bg-secondary)",
                            border: simRounds === n ? "1px solid var(--accent)" : "1px solid var(--border-light)",
                            color: simRounds === n ? "var(--accent)" : "var(--text-tertiary)" }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 10 }}>Focus areas</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {FOCUS_OPTIONS.map(f => (
                        <button key={f} onClick={() => setSimFocusAreas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                          style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", transition: "all 0.2s",
                            background: simFocusAreas.includes(f) ? "var(--accent-light)" : "transparent",
                            border: simFocusAreas.includes(f) ? "1px solid var(--accent)" : "1px solid var(--border)",
                            color: simFocusAreas.includes(f) ? "var(--accent)" : "var(--text-tertiary)" }}>
                          {simFocusAreas.includes(f) && <><IconCheck size={10} /> </>}{f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={simulate} disabled={!simScenario.trim() || simStarting}
              style={{ width: "100%", padding: 16, borderRadius: 10, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: simScenario.trim() && !simStarting ? "pointer" : "not-allowed", opacity: simScenario.trim() ? 1 : 0.4, transition: "all 0.2s", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {simStarting && <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />}
              {simStarting ? t("sim.starting", lang) : t("sim.start", lang)}
            </button>
          </div>
        </div>
      );
    }

    if (simulating) {
      const elapsed = simStartTime ? Math.floor((Date.now() - simStartTime) / 1000) : 0;
      const remaining = Math.max(0, 120 - elapsed);
      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40, paddingTop: 24 }}>
              <div style={{ position: "relative", width: 180, height: 180, marginBottom: 20 }}>
                <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
                  <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent-hover)" /></linearGradient></defs>
                  <circle cx="90" cy="90" r={ringR} fill="none" stroke="var(--border-light)" strokeWidth="6" />
                  <circle cx="90" cy="90" r={ringR} fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringOff} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                  <StageIcon index={simStage} size={28} />
                  <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", marginTop: 6 }}>Stage {simStage + 1}/5</span>
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{t(SIM_STAGE_KEYS[simStage] || "stage.0", lang)}</div>
              {simLiveAgents.length > 0 && simTotalAgents > 0 && (
                <div style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>
                  {t("sim.agent_progress", lang, { current: String(simLiveAgents.filter(a => a.done).length), total: String(simTotalAgents) })}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>~{remaining > 60 ? `${Math.ceil(remaining / 60)} min` : `${remaining}s`} remaining</div>
            </div>
            <div className="sim-progress-layout" style={{ display: "grid", gridTemplateColumns: simLiveAgents.length > 0 ? "200px 1fr" : "1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {SIM_STAGE_KEYS.map((key, idx) => {
                  const isDone = idx < simStage, isCurrent = idx === simStage;
                  return (
                    <div key={key} style={{ display: "flex", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", flexShrink: 0, transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center",
                          background: isDone ? "var(--accent)" : isCurrent ? "var(--accent-light)" : "var(--bg-tertiary)",
                          border: isCurrent ? "2px solid var(--accent)" : isDone ? "none" : "1px solid var(--border)",
                          ...(isCurrent ? { animation: "accentPulse 2s ease-in-out infinite" } : {}) }}>
                          {isDone && <IconCheck size={8} style={{ color: "#fff" }} />}
                        </div>
                        {idx < 4 && <div style={{ width: 1, flex: 1, minHeight: 28, background: isDone ? "var(--accent)" : "var(--border-light)", transition: "background 0.3s", opacity: isDone ? 0.4 : 1 }} />}
                      </div>
                      <div style={{ paddingBottom: 20 }}>
                        <div style={{ fontSize: 12, color: isDone ? "var(--text-tertiary)" : isCurrent ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: isCurrent ? 500 : 400, display: "flex", alignItems: "center", gap: 6, transition: "color 0.3s" }}>
                          <StageIcon index={idx} size={14} /> {t(key, lang)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {simLiveAgents.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>{t("sim.agents_in_sim", lang)}</div>
                  {simLiveAgents.map((a, i) => {
                    const catColor = AGENT_CATEGORY_COLORS[a.category || ""] || DEFAULT_CATEGORY_COLOR;
                    return (
                      <div key={`${a.name}-${i}`} style={{ padding: "12px 16px", borderRadius: 10, background: "var(--bg-secondary)", border: `1px solid ${a.done ? catColor.border : "var(--border-light)"}`, transition: "all 0.3s", animation: "fadeInUp 0.3s ease-out", borderLeftWidth: 3, borderLeftColor: catColor.color }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{a.name}</span>
                          {a.category && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: catColor.bg, color: catColor.color, letterSpacing: "0.05em", textTransform: "uppercase" }}>{t(`sim.category.${a.category}`, lang)}</span>}
                        </div>
                        {a.role && <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>{a.role}</div>}
                        <div style={{ fontSize: 11, color: a.done ? "var(--success)" : "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
                          {a.done ? <><IconCheck size={12} /> {t("common.online", lang)}</> : <>{t("common.loading", lang)}</>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (simResult?.error) {
      return (
        <div style={{ flex: 1, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", animation: "fadeInUp 0.3s ease-out" }}>
            <div style={{ color: "var(--error)", marginBottom: 16, display: "flex", justifyContent: "center" }}><IconWarning size={48} /></div>
            <div style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 24 }}>{simResult.error}</div>
            <button onClick={() => setSimResult(null)} style={{ padding: "10px 24px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>{t("sim.try_again", lang)}</button>
          </div>
        </div>
      );
    }

    if (simResult) {
      const meta = simResult.metadata || {};
      const stagesData = simResult.stages || {};
      const simAgents = stagesData.agents || [];
      const simParams = stagesData.simulation_parameters || {};
      const graph = stagesData.graph || {};
      const simulation = simResult.simulation || [];
      const duration = simStartTime ? Math.floor((Date.now() - simStartTime) / 1000) : 0;
      const reportText = simResult.report || "";
      const verdictIsNoGo = /NO[- ]?GO/i.test(reportText.slice(Math.max(0, reportText.lastIndexOf("VERDICT"))));
      const uniqueRounds = [...new Set(simulation.map((m: any) => m.round))].sort();
      const uniqueCategories = [...new Set(simAgents.map((a: any) => a.category).filter(Boolean))] as string[];
      const uniqueAgentNames = [...new Set(simulation.map((m: any) => m.agentName))] as string[];
      const filteredSimulation = agentFilter
        ? (uniqueCategories.includes(agentFilter)
            ? simulation.filter((m: any) => m.category === agentFilter)
            : simulation.filter((m: any) => m.agentName === agentFilter))
        : simulation;
      const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
      const getRiskColor = (text: string) => {
        const l = text.toLowerCase();
        if (l.includes("high") || l.includes("alto")) return { border: "var(--error)", bg: "rgba(239,68,68,0.04)" };
        if (l.includes("medium") || l.includes("m\u00e9dio")) return { border: "var(--warning)", bg: "rgba(245,158,11,0.04)" };
        return { border: "var(--success)", bg: "rgba(16,185,129,0.04)" };
      };
      const reportSections: { heading: string; content: string; level: number }[] = [];
      const rLines = reportText.split("\n");
      let cHead = "", cContent = "", cLevel = 0;
      for (const line of rLines) {
        const h2 = line.match(/^## (.+)/), h3 = line.match(/^### (.+)/);
        if (h2) { if (cHead) reportSections.push({ heading: cHead, content: cContent.trim(), level: cLevel }); cHead = h2[1]; cContent = ""; cLevel = 2; }
        else if (h3 && cLevel < 2) { if (cHead) reportSections.push({ heading: cHead, content: cContent.trim(), level: cLevel }); cHead = h3[1]; cContent = ""; cLevel = 3; }
        else cContent += line + "\n";
      }
      if (cHead) reportSections.push({ heading: cHead, content: cContent.trim(), level: cLevel });

      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 32 }} className="sim-result-outer">
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40, paddingTop: 16, animation: "fadeInUp 0.4s ease-out" }}>
              <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "0.04em", color: verdictIsNoGo ? "var(--error)" : "var(--success)", marginBottom: 8 }}>{verdictIsNoGo ? "NO-GO" : "GO"}</div>
              <div style={{ fontSize: 14, color: "var(--text-tertiary)", maxWidth: 500, margin: "0 auto" }}>{t("sim.running_subtitle", lang)}</div>
            </div>
            <div className="sim-result-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{t("sim.result_title", lang)}</div>
              <div style={{ display: "flex", gap: 8, position: "relative" }}>
                <button onClick={() => { setSimResult(null); setSimScenario(""); setSimStartTime(null); }}
                  style={{ fontSize: 13, color: "var(--text-secondary)", background: "transparent", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}>{t("sim.new_simulation", lang)}</button>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setExportOpen(!exportOpen)}
                    style={{ fontSize: 13, color: "#fff", background: "var(--accent)", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    <IconExport size={14} /> {t("sim.export", lang)} <IconChevron size={12} direction={exportOpen ? "up" : "down"} />
                  </button>
                  {exportOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, minWidth: 180, zIndex: 20, animation: "fadeIn 0.15s ease", boxShadow: "var(--shadow-lg)" }}>
                      <button onClick={() => { exportReport(); setExportOpen(false); addToast("Report exported as TXT", "success"); }}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-primary)", textAlign: "left", borderRadius: 6, transition: "background 0.15s", display: "flex", alignItems: "center", gap: 8 }}>
                        <IconFile size={14} /> Export as TXT
                      </button>
                      <button disabled style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", fontSize: 12, color: "var(--text-tertiary)", textAlign: "left", borderRadius: 6, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
                        <IconFile size={14} /> Export as PDF <span style={{ fontSize: 9, marginLeft: "auto", color: "var(--text-tertiary)" }}>Soon</span>
                      </button>
                      <button disabled style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", fontSize: 12, color: "var(--text-tertiary)", textAlign: "left", borderRadius: 6, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
                        <IconLink size={14} /> Share Link <span style={{ fontSize: 9, marginLeft: "auto", color: "var(--text-tertiary)" }}>Soon</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="sim-meta-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 32 }}>
              {[
                { icon: <IconAgents size={16} />, value: `${meta.agents_count || 0}`, label: t("sim.specialists", lang) },
                { icon: <IconRetry size={16} />, value: `${meta.rounds || 0}`, label: t("sim.rounds", lang) },
                { icon: <IconChat size={16} />, value: `${meta.total_interactions || 0}`, label: t("sim.interactions", lang) },
                { icon: <IconGraph size={16} />, value: simParams.scenario_type || "\u2014", label: t("sim.type", lang) },
                { icon: <IconSearch size={16} />, value: duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`, label: "Duration" },
              ].map((c, ci) => (
                <div key={c.label + ci} style={{ padding: 16, borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-light)", animation: `fadeInUp ${0.3 + ci * 0.05}s ease-out` }}>
                  <div style={{ color: "var(--text-tertiary)", marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{c.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase" }}>{t("sim.agents_in_sim", lang)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {simAgents.map((a: any) => {
                const catColor = AGENT_CATEGORY_COLORS[a.category || ""] || DEFAULT_CATEGORY_COLOR;
                return (
                  <div key={a.id || a.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 20, background: "var(--bg-secondary)", border: `1px solid ${catColor.border}`, borderLeft: `3px solid ${catColor.color}` }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: catColor.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: catColor.color }}>{a.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{a.role}</div>
                    </div>
                    {a.category && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: catColor.bg, color: catColor.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t(`sim.category.${a.category}`, lang)}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 28, padding: 4, background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border-light)", width: "fit-content" }}>
              {(["report", "simulation", "graph"] as const).map(tab => (
                <button key={tab} onClick={() => setResultTab(tab)}
                  style={{ padding: "8px 20px", fontSize: 13, cursor: "pointer", borderRadius: 8, border: "none", transition: "all 0.2s",
                    background: resultTab === tab ? "var(--accent)" : "transparent",
                    color: resultTab === tab ? "#fff" : "var(--text-tertiary)",
                    fontWeight: resultTab === tab ? 600 : 400 }}>
                  {tab === "report" ? t("sim.tab_report", lang) : tab === "simulation" ? t("sim.tab_simulation", lang) : t("sim.tab_graph", lang)}
                </button>
              ))}
            </div>
            {resultTab === "report" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                {reportSections.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {reportSections.map((section, si) => {
                      const sKey = `s-${si}`;
                      const isCollapsed = collapsedSections[sKey];
                      const isRiskMap = section.heading.toLowerCase().includes("risk");
                      const isScenarios = section.heading.toLowerCase().includes("scenario") || section.heading.toLowerCase().includes("cen\u00e1rio");
                      return (
                        <div key={sKey} style={{ borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-light)", overflow: "hidden", animation: `fadeInUp ${0.15 + si * 0.04}s ease-out` }}>
                          <button onClick={() => toggleSection(sKey)}
                            style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{section.heading}</span>
                            <IconChevron size={14} direction={isCollapsed ? "right" : "down"} style={{ color: "var(--text-tertiary)" }} />
                          </button>
                          {!isCollapsed && (
                            <div style={{ padding: "0 20px 20px", fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                              {isRiskMap ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {section.content.split(/(?=^-\s)/m).filter(Boolean).map((risk, ri) => {
                                    const rc = getRiskColor(risk);
                                    return <div key={ri} style={{ padding: "12px 16px", borderRadius: 8, background: rc.bg, borderLeft: `3px solid ${rc.border}`, fontSize: 14 }}><ReactMarkdown components={MD_COMPONENTS}>{risk.trim()}</ReactMarkdown></div>;
                                  })}
                                </div>
                              ) : isScenarios ? (
                                <div className="sim-scenarios-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                                  {section.content.split(/(?=^###\s)/m).filter(s => s.trim()).map((sc, sci) => {
                                    const tm = sc.match(/^###\s*(.+)/);
                                    const title = tm ? tm[1] : `Scenario ${sci + 1}`;
                                    const body = tm ? sc.slice(tm[0].length) : sc;
                                    const isOpt = title.toLowerCase().includes("otimist") || title.toLowerCase().includes("optimist");
                                    const isPes = title.toLowerCase().includes("pessimist");
                                    const bc = isOpt ? "var(--success)" : isPes ? "var(--error)" : "var(--warning)";
                                    return (
                                      <div key={sci} style={{ padding: "16px 18px", borderRadius: 10, background: "var(--bg-primary)", border: "1px solid var(--border-light)", borderTop: `2px solid ${bc}` }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{title}</div>
                                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}><ReactMarkdown components={MD_COMPONENTS}>{body.trim()}</ReactMarkdown></div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <ReactMarkdown components={MD_COMPONENTS}>{section.content}</ReactMarkdown>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: 24, borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-light)", fontSize: 15, lineHeight: 1.7 }}>
                    <ReactMarkdown components={MD_COMPONENTS}>{reportText}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
            {resultTab === "simulation" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  <button onClick={() => setAgentFilter(null)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: "none", background: !agentFilter ? "var(--accent-light)" : "var(--bg-secondary)", color: !agentFilter ? "var(--accent)" : "var(--text-tertiary)" }}>{t("sim.filter_all", lang)}</button>
                  {uniqueCategories.map(cat => {
                    const cc = AGENT_CATEGORY_COLORS[cat] || DEFAULT_CATEGORY_COLOR;
                    return (
                      <button key={cat} onClick={() => setAgentFilter(agentFilter === cat ? null : cat)}
                        style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: agentFilter === cat ? `1px solid ${cc.border}` : "1px solid transparent", background: agentFilter === cat ? cc.bg : "var(--bg-secondary)", color: agentFilter === cat ? cc.color : "var(--text-tertiary)", transition: "all 0.15s" }}>{t(`sim.category.${cat}`, lang)}</button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  {uniqueAgentNames.map(name => (
                    <button key={name} onClick={() => setAgentFilter(agentFilter === name ? null : name)}
                      style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10, cursor: "pointer", border: "none", background: agentFilter === name ? "var(--accent-light)" : "var(--bg-secondary)", color: agentFilter === name ? "var(--accent)" : "var(--text-tertiary)" }}>{name}</button>
                  ))}
                </div>
                {uniqueRounds.map((round: any) => {
                  const roundMsgs = filteredSimulation.filter((m: any) => m.round === round);
                  if (!roundMsgs.length) return null;
                  return (
                    <div key={`round-${round}`} style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ height: 1, flex: 1, background: "var(--border-light)" }} />
                        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Round {round}</span>
                        <div style={{ height: 1, flex: 1, background: "var(--border-light)" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {roundMsgs.map((msg: any, i: number) => {
                          const hasDebate = msg.content.toLowerCase().includes("discordo") || msg.content.toLowerCase().includes("disagree") || msg.content.toLowerCase().includes("however");
                          return (
                            <div key={`${round}-${msg.agentName}-${i}`} style={{ padding: 18, borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderLeft: hasDebate ? "3px solid var(--warning)" : `3px solid ${(AGENT_CATEGORY_COLORS[msg.category || ""] || DEFAULT_CATEGORY_COLOR).color}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: (AGENT_CATEGORY_COLORS[msg.category || ""] || DEFAULT_CATEGORY_COLOR).bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: (AGENT_CATEGORY_COLORS[msg.category || ""] || DEFAULT_CATEGORY_COLOR).color, flexShrink: 0 }}>{msg.agentName.charAt(0)}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{msg.agentName}</div>
                                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{msg.role}{msg.category && ` · ${t(`sim.category.${msg.category}`, lang)}`}</div>
                                </div>
                                {msg.category && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: (AGENT_CATEGORY_COLORS[msg.category] || DEFAULT_CATEGORY_COLOR).bg, color: (AGENT_CATEGORY_COLORS[msg.category] || DEFAULT_CATEGORY_COLOR).color, letterSpacing: "0.05em", textTransform: "uppercase" }}>{t(`sim.category.${msg.category}`, lang)}</span>}
                                {hasDebate && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--warning)", letterSpacing: "0.05em" }}>DEBATE</span>}
                              </div>
                              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {resultTab === "graph" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.entities", lang)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
                  {(graph.entities || []).map((e: any, i: number) => {
                    const c = ENTITY_COLORS[e.type] || DEFAULT_ENTITY_COLOR;
                    return (
                      <div key={`entity-${i}`} style={{ padding: "10px 16px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, animation: `fadeInUp ${0.15 + i * 0.04}s ease-out` }}>
                        <div style={{ fontSize: 13, color: c.color, fontWeight: 500 }}>{e.name}</div>
                        <div style={{ fontSize: 10, color: c.color, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{e.type}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.relationships", lang)}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
                  {(graph.relationships || []).map((r: any, i: number) => (
                    <div key={`rel-${i}`} style={{ padding: "14px 18px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{r.from}</span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center" }}><div style={{ height: 1, flex: 1, background: "var(--border)" }} /><span style={{ color: "var(--text-tertiary)", margin: "0 6px", fontSize: 12 }}>&rarr;</span><div style={{ height: 1, flex: 1, background: "var(--border)" }} /></div>
                      <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{r.to}</span>
                      <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}>{r.type?.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
                {graph.key_variables?.length > 0 && (<>
                  <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.key_variables", lang)}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 32 }}>
                    {graph.key_variables.map((v: string, i: number) => <span key={`kv-${i}`} style={{ padding: "6px 14px", borderRadius: 10, fontSize: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>{v}</span>)}
                  </div>
                </>)}
                {graph.critical_questions?.length > 0 && (<>
                  <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.critical_questions", lang)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {graph.critical_questions.map((q: string, i: number) => <div key={`cq-${i}`} style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.04)", borderLeft: "3px solid var(--error)", fontSize: 13, color: "var(--text-secondary)" }}>{q}</div>)}
                  </div>
                </>)}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  /* ══════════════════════════════════════════════════════ */
  /* MAIN RENDER                                            */
  /* ══════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40, animation: "fadeIn 0.15s ease" }} />}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 260, background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)", padding: "16px 12px", flexShrink: 0, display: "flex", flexDirection: "column", zIndex: 50 }}>
        {/* Logo */}
        <div style={{ padding: "4px 8px", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.18em", color: "var(--accent)", fontFamily: "var(--font-sans)" }}>SIGNUX</span>
        </div>

        {/* New conversation button */}
        <button onClick={() => { if (mode === "chat") { setMessages([]); } else { setSimResult(null); setSimScenario(""); setSimulating(false); } setSidebarOpen(false); addToast(mode === "chat" ? t("sidebar.new_chat", lang) : t("sidebar.new_simulation", lang), "info"); }}
          style={{ width: "100%", fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", padding: "10px 12px", background: "none", border: "1px solid var(--border-light)", borderRadius: 8, textAlign: "left", transition: "all 0.15s", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}
          className="sidebar-new-btn">
          <IconPlus size={14} /> {mode === "chat" ? t("sidebar.new_chat", lang) : t("sidebar.new_simulation", lang)}
        </button>

        <div style={{ height: 1, background: "var(--border-light)", marginBottom: 12 }} />

        {/* Mode toggle */}
        <div style={{ display: "flex", marginBottom: 16, borderRadius: 8, overflow: "hidden", background: "var(--bg-secondary)", border: "1px solid var(--border-light)" }}>
          <button onClick={() => setMode("chat")}
            style={{ flex: 1, padding: "10px 0", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: mode === "chat" ? "var(--sidebar-active)" : "transparent", color: mode === "chat" ? "var(--accent)" : "var(--text-tertiary)", border: "none", cursor: "pointer", transition: "all 0.2s" }}>
            <IconChat size={14} /> {t("sidebar.mode_chat", lang)}
          </button>
          <button onClick={() => { setMode("simulate"); setSimResult(null); setSimulating(false); }}
            style={{ flex: 1, padding: "10px 0", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: mode === "simulate" ? "var(--sidebar-active)" : "transparent", color: mode === "simulate" ? "var(--accent)" : "var(--text-tertiary)", border: "none", cursor: "pointer", transition: "all 0.2s" }}>
            <IconSimulate size={14} /> {t("sidebar.mode_simulate", lang)}
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border-light)", marginBottom: 12 }} />

        {/* Pipeline (simulate mode) */}
        {mode === "simulate" ? (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 10, padding: "0 8px" }}>Pipeline</div>
            {SIM_STAGE_KEYS.map((key, i) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "var(--text-tertiary)" }}>
                <StageIcon index={i} size={14} />
                <span style={{ fontSize: 12 }}>{t(key, lang)}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ flex: 1 }} />}

        {/* History placeholders */}
        {mode === "chat" && (
          <div style={{ marginTop: 8, borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.05em", color: "var(--text-tertiary)", textTransform: "uppercase", padding: "0 8px", marginBottom: 8 }}>{t("sidebar.history", lang)}</div>
            <div style={{ padding: "0 8px" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>{t("common.today", lang)}</div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--bg-tertiary)", marginBottom: 10 }} />
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>{t("common.previous_7_days", lang)}</div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--bg-tertiary)", marginBottom: 4 }} />
              <div style={{ height: 8, borderRadius: 4, background: "var(--bg-tertiary)", width: "70%" }} />
            </div>
          </div>
        )}

        {/* Rates */}
        {rates && (
          <div style={{ padding: "8px 8px 0", marginTop: 8, borderTop: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
              USD/BRL {rates.USDBRL?.toFixed(2)} &middot; USD/CNY {rates.USDCNY?.toFixed(2)}
            </div>
          </div>
        )}

        {/* User info */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--accent)", flexShrink: 0 }}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{profileName}</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{lang.toUpperCase()}</div>
            </div>
            <button onClick={() => setShowShortcuts(true)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", padding: 4 }}><IconSettings size={16} /></button>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", padding: "4px 8px" }}>{t("common.version", lang)}</div>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-primary)", minWidth: 0 }}>
        {/* Mobile menu button - no header bar */}
        <div className="mobile-header" style={{ display: "none", padding: "12px 16px", borderBottom: "1px solid var(--border-light)", alignItems: "center", gap: 8 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4, display: "flex" }}><IconMenu size={18} /></button>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>SIGNUX</span>
        </div>

        {mode === "simulate" ? renderSimulation() : (
          <>
            <div ref={messagesAreaRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }} className="messages-area">
              {messages.length === 0 ? (
                /* ═══ WELCOME STATE ═══ */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", maxWidth: 720, margin: "0 auto", width: "100%", padding: 24 }}>
                  <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "var(--font-sans)", color: "var(--text-primary)", marginBottom: 8, animation: "fadeInUp 0.4s ease-out" }}>
                    {t("chat.welcome", lang, { name: profileName })}
                  </div>
                  <div style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 36, animation: "fadeInUp 0.5s ease-out" }}>
                    {t("chat.welcome_subtitle", lang)}
                  </div>
                  <div className="suggestions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", maxWidth: 560, animation: "fadeInUp 0.6s ease-out" }}>
                    {SUGGESTION_KEYS.map(key => (
                      <div key={key} onClick={() => send(t(key, lang))} className="card-hover"
                        style={{ padding: "16px 18px", borderRadius: 10, background: "transparent", border: "1px solid var(--border-light)", fontSize: 14, color: "var(--text-secondary)", cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.15s" }}>
                        {t(key, lang)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ═══ MESSAGES ═══ */
                <div style={{ width: "100%" }}>
                  {messages.map((m, i) => (
                    <div key={`msg-${i}`} onMouseEnter={() => setHoveredMsg(i)} onMouseLeave={() => setHoveredMsg(null)}
                      style={{ padding: "24px 0", borderBottom: "1px solid var(--border-light)", background: m.role === "user" ? "var(--bg-chat-user)" : "var(--bg-chat-ai)" }}>
                      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2,
                          ...(m.role === "user"
                            ? { background: "var(--bg-tertiary)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }
                            : { background: "var(--accent-light)", color: "var(--accent)" }) }}>
                          {m.role === "user" ? userInitials : <IconZap size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", color: "var(--text-primary)", marginBottom: 6 }}>
                            {m.role === "user" ? "You" : "Signux"}
                          </div>
                          <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)", wordBreak: "break-word" as const }}>
                            {m.role === "user" ? <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span> : (
                              <>
                                <ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown>
                                {loading && i === messages.length - 1 && <span style={{ display: "inline-block", width: 2, height: 16, background: "var(--text-primary)", marginLeft: 2, animation: "blink 1s infinite", verticalAlign: "text-bottom" }} />}
                              </>
                            )}
                          </div>
                          {/* Action buttons — icons only, on hover */}
                          {m.role === "assistant" && !(loading && i === messages.length - 1) && m.content && (
                            <div style={{ display: "flex", gap: 2, marginTop: 10, opacity: hoveredMsg === i || feedback[i] ? 1 : 0, transition: "opacity 0.15s" }}>
                              <button onClick={() => { navigator.clipboard.writeText(m.content); setCopiedIndex(i); addToast(t("chat.copied", lang), "success"); setTimeout(() => setCopiedIndex(null), 2000); }}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, display: "flex", color: copiedIndex === i ? "var(--success)" : "var(--text-tertiary)", transition: "all 0.15s" }}
                                title={t("chat.copy", lang)}>
                                {copiedIndex === i ? <IconCheck size={16} /> : <IconCopy size={16} />}
                              </button>
                              {i === messages.length - 1 && (
                                <button onClick={() => { const lastU = messages.filter(msg => msg.role === "user").pop(); if (lastU) { setMessages(messages.slice(0, -1)); setTimeout(() => setInput(lastU.content), 100); } }}
                                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, display: "flex", color: "var(--text-tertiary)", transition: "all 0.15s" }}
                                  title={t("chat.retry", lang)}>
                                  <IconRetry size={16} />
                                </button>
                              )}
                              <button onClick={() => setFeedback(prev => ({ ...prev, [i]: prev[i] === "positive" ? "" : "positive" }))}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: feedback[i] === "positive" ? "var(--success)" : "var(--text-tertiary)", transition: "all 0.15s", display: "flex" }}
                                title={t("chat.good", lang)}>
                                <IconThumbUp size={16} />
                              </button>
                              <button onClick={() => setFeedback(prev => ({ ...prev, [i]: prev[i] === "negative" ? "" : "negative" }))}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: feedback[i] === "negative" ? "var(--error)" : "var(--text-tertiary)", transition: "all 0.15s", display: "flex" }}
                                title={t("chat.bad", lang)}>
                                <IconThumbDown size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Loading dots */}
                  {loading && messages[messages.length - 1]?.content === "" && (
                    <div style={{ padding: "24px 0", borderBottom: "1px solid var(--border-light)" }}>
                      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}><IconZap size={16} /></div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", color: "var(--text-primary)", marginBottom: 8 }}>Signux</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-tertiary)" }}>
                            <span className="loading-dots"><span /><span /><span /></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
              {showScrollBtn && messages.length > 0 && (
                <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                  style={{ position: "sticky", bottom: 16, alignSelf: "center", padding: "6px 14px", borderRadius: 20, background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer", boxShadow: "var(--shadow-md)", transition: "all 0.15s", animation: "fadeIn 0.15s ease", zIndex: 5, display: "flex", alignItems: "center", gap: 4 }}>
                  <IconArrowDown size={12} />
                </button>
              )}
            </div>

            {/* ═══ INPUT AREA ═══ */}
            <div style={{ padding: "12px 24px 16px", borderTop: "1px solid var(--border-light)", flexShrink: 0, background: "var(--bg-primary)" }} className="input-area">
              <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", position: "relative" }}>
                <textarea ref={inputRef} value={input} onChange={handleTextareaInput} onKeyDown={handleKey} placeholder={t("chat.placeholder", lang)} rows={1}
                  style={{ width: "100%", resize: "none", padding: "14px 48px 14px 16px", borderRadius: 12, background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 15, outline: "none", fontFamily: "var(--font-sans)", transition: "border-color 0.15s", lineHeight: 1.5 }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")} onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                <button onClick={() => send()} disabled={!input.trim() || loading}
                  style={{ position: "absolute", right: 8, bottom: 8, width: 32, height: 32, borderRadius: "50%", background: input.trim() && !loading ? "var(--accent)" : "var(--bg-tertiary)", border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", color: input.trim() && !loading ? "#fff" : "var(--text-tertiary)" }}>
                  <IconArrowUp size={16} />
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
                {t("common.disclaimer", lang)}
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        .sidebar-new-btn:hover { border-color: var(--border) !important; color: var(--text-secondary) !important; }
        textarea::placeholder { color: var(--text-tertiary); }
        .card-hover:hover { border-color: var(--border) !important; background: var(--bg-secondary) !important; }
        @media (max-width: 768px) {
          .sidebar { position: fixed !important; left: 0 !important; top: 0 !important; bottom: 0 !important; transform: translateX(-100%); transition: transform 0.25s ease; }
          .sidebar.open { transform: translateX(0) !important; }
          .mobile-header { display: flex !important; }
          .messages-area { padding: 0 !important; }
          .input-area { padding: 10px 16px 14px !important; }
          .suggestions-grid { grid-template-columns: 1fr !important; }
          .sim-progress-layout { grid-template-columns: 1fr !important; }
          .sim-scenarios-grid { grid-template-columns: 1fr !important; }
          .sim-result-header { flex-direction: column !important; align-items: flex-start !important; }
          .sim-meta-cards { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {showShortcuts && (
        <>
          <div onClick={() => setShowShortcuts(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, animation: "fadeIn 0.15s ease" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101, width: 360, padding: 24, borderRadius: 12, background: "var(--bg-primary)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", animation: "scaleIn 0.15s ease-out" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Keyboard shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex" }}><IconClose size={16} /></button>
            </div>
            {SHORTCUTS.map((s, i) => (
              <div key={`shortcut-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < SHORTCUTS.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.desc}</span>
                <div style={{ display: "flex", gap: 4 }}>{s.keys.map((k, j) => <span key={`key-${i}-${j}`} className="kbd">{k}</span>)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
