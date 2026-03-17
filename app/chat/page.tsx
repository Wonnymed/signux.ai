"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "../lib/profile";
import { t, Language, setLanguage } from "../lib/i18n";
import type { Message, Toast, SimAgent, SimResult, Mode } from "../lib/types";
import { Check, AlertTriangle, Info, PanelLeft } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import SimulationEngine from "../components/SimulationEngine";
import IntelBriefing from "../components/IntelBriefing";
import SettingsModal from "../components/SettingsModal";
import OnboardingTour, { isTourCompleted } from "../components/OnboardingTour";

/* ═══ Toast System ═══ */
let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 200 }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}${toast.dismissing ? " dismissing" : ""}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span style={{ display: "flex" }}>
            {toast.type === "success" ? <Check size={14} /> : toast.type === "error" ? <AlertTriangle size={14} /> : <Info size={14} />}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ Main Orchestrator ═══ */
export default function ChatPage() {
  const router = useRouter();

  /* ── State ── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Language>("en");
  const [rates, setRates] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [mode, setMode] = useState<Mode>("chat");
  const [searching, setSearching] = useState(false);

  /* Intel */
  const [intelContent, setIntelContent] = useState("");
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelTimestamp, setIntelTimestamp] = useState<string | null>(null);
  const [intelFocus, setIntelFocus] = useState<string[]>([]);

  /* Simulation */
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simScenario, setSimScenario] = useState("");
  const [simStage, setSimStage] = useState(0);
  const [simLiveAgents, setSimLiveAgents] = useState<SimAgent[]>([]);
  const [simTotalAgents, setSimTotalAgents] = useState(0);
  const [simStarting, setSimStarting] = useState(false);
  const [simStartTime, setSimStartTime] = useState<number | null>(null);

  /* UI */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showTour, setShowTour] = useState(false);

  /* Refs */
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ═══ Toast Callbacks ═══ */
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

  /* ═══ Profile Loading Effect ═══ */
  useEffect(() => {
    const profile = getProfile();
    if (!profile || !profile.name || !profile.email) {
      router.replace("/onboarding");
      return;
    }
    setProfileName(profile.name);
    const userLang = (profile.language as Language) || "en";
    setLang(userLang);
    setLanguage(userLang);
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
    // Show tour for first-time users
    if (!isTourCompleted()) {
      setTimeout(() => setShowTour(true), 500);
    }
  }, [router, addToast]);

  /* ═══ Keyboard Shortcuts Effect ═══ */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (meta && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setMode(prev => prev === "chat" ? "simulate" : prev === "simulate" ? "intel" : "chat");
      } else if (meta && e.key === "n") {
        e.preventDefault();
        if (mode === "chat") {
          setMessages([]);
        } else {
          setSimResult(null);
          setSimScenario("");
          setSimulating(false);
        }
        addToast(mode === "chat" ? t("sidebar.new_chat") : t("sidebar.new_simulation"), "info");
      } else if (e.key === "Escape") {
        setSidebarOpen(false);
        setShowSettings(false);
      } else if (e.key === "?" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setShowSettings(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, lang, addToast]);

  /* ═══ Chat Handler ═══ */
  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setSearching(false);
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
              if (data.type === "searching") {
                setSearching(true);
              } else if (data.type === "text") {
                setSearching(false);
                fullText += data.text;
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              } else if (data.type === "tool") {
                fullText += `\n\n---\n**${data.name.replace(/_/g, " ")}**\n`;
                if (data.result?.breakdown) {
                  fullText += "\n| Item | Value |\n|---|---|\n";
                  Object.entries(data.result.breakdown).forEach(([k, v]) => {
                    fullText += `| ${k.replace(/_/g, " ")} | ${v} |\n`;
                  });
                } else if (data.result && !data.result.error) {
                  Object.entries(data.result).forEach(([k, v]) => {
                    if (k !== "note") fullText += `- **${k.replace(/_/g, " ")}**: ${v}\n`;
                  });
                  if (data.result.note) fullText += `\n> ${data.result.note}\n`;
                }
                fullText += "\n---\n\n";
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              } else if (data.type === "error") {
                fullText += `\n\n${t("common.error")}: ${data.message}`;
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullText };
                  return u;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: t("chat.connection_error") };
        return u;
      });
    }
    setLoading(false);
    setSearching(false);
    inputRef.current?.focus();
  };

  /* ═══ Simulate Handler ═══ */
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
    setSimStartTime(Date.now());
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: simScenario, context: getProfile() }),
      });
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
            if (data.type === "stage") setSimStage(data.stage === -1 ? 0 : data.stage + 1);
            else if (data.type === "stage_done" && data.totalAgents) setSimTotalAgents(data.totalAgents);
            else if (data.type === "agent_start") setSimLiveAgents(prev => [...prev, { name: data.agentName, role: data.role, category: data.category, done: false }]);
            else if (data.type === "agent_done") setSimLiveAgents(prev => prev.map(a => a.name === data.agentName && !a.done ? { ...a, done: true } : a));
            else if (data.type === "complete") setSimResult(data.result);
            else if (data.type === "error") setSimResult({ error: data.error || "Simulation error." });
          } catch {}
        }
      }
    } catch {
      setSimResult({ error: "Simulation error. Try again." });
    }
    setSimulating(false);
  };

  /* ═══ Intel Handler ═══ */
  const generateIntel = async () => {
    setIntelLoading(true);
    setIntelContent("");
    setIntelTimestamp(null);
    try {
      const res = await fetch("/api/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus_areas: intelFocus, language: lang }),
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
                setIntelContent(fullText);
              } else if (data.type === "done") {
                setIntelTimestamp(data.timestamp || new Date().toISOString());
              }
            } catch {}
          }
        }
      }
    } catch {
      setIntelContent("Error generating briefing. Please try again.");
    }
    setIntelLoading(false);
  };

  /* ═══ Ask About Intel ═══ */
  const askAboutIntel = (section: string) => {
    setMode("chat");
    const question = section.slice(0, 300);
    setTimeout(() => send(question), 200);
  };

  /* ═══ Copy Handler ═══ */
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addToast(t("chat.copied"), "success");
    }).catch(() => {
      addToast("Failed to copy", "error");
    });
  };

  /* ═══ Retry Handler ═══ */
  const onRetry = () => {
    if (messages.length < 2) return;
    const lastUser = messages[messages.length - 2];
    if (lastUser.role !== "user") return;
    setMessages(prev => prev.slice(0, -1));
    setInput(lastUser.content);
  };

  /* ═══ New Conversation ═══ */
  const onNewConversation = () => {
    if (mode === "chat") {
      setMessages([]);
    } else {
      setSimResult(null);
      setSimScenario("");
      setSimulating(false);
    }
    addToast(mode === "chat" ? t("sidebar.new_chat") : t("sidebar.new_simulation"), "info");
  };

  /* ═══ Simulation Reset ═══ */
  const onReset = () => {
    setSimResult(null);
    setSimScenario("");
    setSimulating(false);
    setSimLiveAgents([]);
    setSimTotalAgents(0);
    setSimStage(0);
    setSimStartTime(null);
  };

  /* ═══ Render ═══ */
  if (!ready) return null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
            zIndex: 40, animation: "fadeIn 0.15s ease",
          }}
        />
      )}

      {/* Sidebar — hidden by default, shown when open */}
      {sidebarOpen && (
        <Sidebar
          mode={mode}
          setMode={setMode}
          profileName={profileName}
          lang={lang}
          rates={rates}
          onNewConversation={onNewConversation}
          onOpenSettings={() => setShowSettings(true)}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-primary)", minWidth: 0 }}>
        {/* Hamburger menu — top-left when sidebar is closed */}
        {!sidebarOpen && (
          <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 10,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              data-tour="sidebar-toggle"
              style={{
                background: "none", border: "none", color: "var(--text-tertiary)",
                cursor: "pointer", display: "flex", padding: 6, borderRadius: 6,
              }}
            >
              <PanelLeft size={20} />
            </button>
          </div>
        )}

        {mode === "intel" ? (
          <IntelBriefing
            intelContent={intelContent}
            intelLoading={intelLoading}
            intelTimestamp={intelTimestamp}
            intelFocus={intelFocus}
            setIntelFocus={setIntelFocus}
            onGenerate={generateIntel}
            onAskAbout={askAboutIntel}
          />
        ) : mode === "simulate" ? (
          <SimulationEngine
            simulating={simulating}
            simResult={simResult}
            simScenario={simScenario}
            setSimScenario={setSimScenario}
            simStage={simStage}
            simLiveAgents={simLiveAgents}
            simTotalAgents={simTotalAgents}
            simStartTime={simStartTime}
            onSimulate={simulate}
            onReset={onReset}
            simStarting={simStarting}
          />
        ) : (
          <ChatArea
            messages={messages}
            loading={loading}
            searching={searching}
            input={input}
            setInput={setInput}
            onSend={send}
            profileName={profileName}
            onRetry={onRetry}
            onCopy={handleCopy}
          />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onLanguageChange={(newLang) => { setLang(newLang); }}
          onNameChange={(newName) => { setProfileName(newName); }}
        />
      )}
      {showTour && (
        <OnboardingTour
          onComplete={() => setShowTour(false)}
          onOpenSidebar={() => setSidebarOpen(true)}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
