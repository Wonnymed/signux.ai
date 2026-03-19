"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { getProfile } from "../lib/profile";
import { t, Language, setLanguage } from "../lib/i18n";
import type { Message, Toast, Attachment, SimAgent, SimResult, Mode } from "../lib/types";
import { Check, AlertTriangle, Info, WifiOff, Square } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import UserMenu from "../components/UserMenu";
import { useAuth } from "../lib/auth";
import { getUser, createUser, updateUser } from "../lib/database";
import {
  getConversations as fetchConversationsDB,
  createConversation as createConversationDB,
  updateConversationTitle as updateTitleDB,
  touchConversation as touchConvDB,
  deleteConversation as removeConversationDB,
  getMessages as fetchMessagesDB,
  saveMessage as saveMessageDB,
  generateSmartTitle,
} from "../lib/database-client";
import type { Conversation } from "../lib/database-client";
import {
  localGetConversations,
  localCreateConversation,
  localUpdateConversationTitle,
  localTouchConversation,
  localDeleteConversation,
  localGetMessages,
  localSaveMessage,
} from "../lib/conversationStore";

import { useIsMobile } from "../lib/useIsMobile";
import { useUserTier } from "../lib/useUserTier";
import type { FileAttachment } from "../components/ChatInput";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import { signuxFetch } from "../lib/api-client";
import { useProjects } from "../lib/useProjects";

const ProjectKnowledge = dynamic(() => import("../components/ProjectKnowledge"), { ssr: false });

const Paywall = dynamic(() => import("../components/Paywall"), { ssr: false });
const SimulationEngine = dynamic(() => import("../components/SimulationEngine"), { ssr: false });
const ResearchView = dynamic(() => import("../components/ResearchView"), { ssr: false });
const LaunchpadView = dynamic(() => import("../components/LaunchpadView"), { ssr: false });
const GlobalOpsView = dynamic(() => import("../components/GlobalOpsView"), { ssr: false });
const InvestView = dynamic(() => import("../components/InvestView"), { ssr: false });
const SettingsModal = dynamic(() => import("../components/SettingsModal"), { ssr: false });
const Onboarding = dynamic(() => import("../components/Onboarding"), { ssr: false });

/* ═══ File Helpers ═══ */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

async function fileToText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(file);
  });
}

async function buildMessageContent(
  text: string,
  attachments: FileAttachment[],
): Promise<any[]> {
  const content: any[] = [];

  for (const att of attachments) {
    if (att.type === "image") {
      const base64 = await fileToBase64(att.file);
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: att.file.type,
          data: base64,
        },
      });
    } else if (att.file.name.toLowerCase().endsWith(".pdf")) {
      const base64 = await fileToBase64(att.file);
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      });
    } else {
      const textContent = await fileToText(att.file);
      content.push({
        type: "text",
        text: `[File: ${att.file.name}]\n\`\`\`\n${textContent}\n\`\`\``,
      });
    }
  }

  if (text.trim()) {
    content.push({ type: "text", text: text });
  }

  return content;
}

/* ═══ Toast System (top-center, max 1) ═══ */
let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const visible = toasts.slice(-1);
  return (
    <div className="toast-container">
      <AnimatePresence>
        {visible.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`toast toast-${toast.type}`}
            onClick={() => onDismiss(toast.id)}
            style={{ animation: "none" }}
          >
            <span style={{ display: "flex" }}>
              {toast.type === "success" ? <Check size={14} /> : toast.type === "error" ? <AlertTriangle size={14} /> : <Info size={14} />}
            </span>
            <span>{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ═══ Offline Banner ═══ */
function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  return (
    <div className="offline-banner">
      <WifiOff size={14} />
      <span>{t("common.offline")}</span>
    </div>
  );
}

/* ═══ Main Orchestrator ═══ */
export default function ChatPage() {
  /* ── State ── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Language>("en");
  const [profileName, setProfileName] = useState("");
  const [mode, setMode] = useState<Mode>("chat");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  /* Simulation */
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simScenario, setSimScenario] = useState("");
  const [simStage, setSimStage] = useState(0);
  const [simAgentMessages, setSimAgentMessages] = useState<any[]>([]);
  const [simLiveAgents, setSimLiveAgents] = useState<SimAgent[]>([]);
  const [simTotalAgents, setSimTotalAgents] = useState(0);
  const [simStarting, setSimStarting] = useState(false);
  const [simStartTime, setSimStartTime] = useState<number | null>(null);

  /* Auth */
  const { user: authUser, loading: authLoading, signOut: authSignOut } = useAuth();

  /* Conversations */
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* UI */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCheckinReminder, setShowCheckinReminder] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const isMobile = useIsMobile();
  const { tier, usage, limits, refresh: refreshUsage } = useUserTier(!!authUser);
  const {
    projects, activeProject, activeProjectId, selectProject,
    createProject, updateProject,
  } = useProjects(!!authUser);

  /* Refs */
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const retryRef = useRef<{ text: string; history: Message[] } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
  const isLoggedIn = !!authUser;
  useEffect(() => {
    // Load localStorage profile
    const profile = getProfile();
    if (profile && profile.name) {
      setProfileName(profile.name);
      const userLang = (profile.language as Language) || "en";
      setLang(userLang);
      setLanguage(userLang);
    }

    setReady(true);
    if (!localStorage.getItem("signux_onboarded")) {
      setShowOnboarding(true);
    }
    const toastData = sessionStorage.getItem("signux_welcome_toast");
    if (toastData) {
      sessionStorage.removeItem("signux_welcome_toast");
      try {
        const { message, type } = JSON.parse(toastData);
        setTimeout(() => addToast(message, type), 300);
      } catch {}
    }
  }, [addToast]);

  /* Sync profile when auth user changes */
  useEffect(() => {
    if (!authUser) {
      setProfileName(getProfile()?.name || "");
      return;
    }
    setProfileName(authUser.name);
    const profile = getProfile();
    getUser(authUser.id).then(dbUser => {
      if (dbUser) {
        if (dbUser.name) setProfileName(dbUser.name);
        if (dbUser.language) { setLang(dbUser.language as Language); setLanguage(dbUser.language as Language); }
      } else {
        createUser({
          auth_id: authUser.id,
          email: authUser.email,
          ...(profile?.name ? { name: profile.name } : { name: authUser.name }),
          ...(profile?.taxResidence ? { country: profile.taxResidence } : {}),
          ...(profile?.operations?.length ? { operations: profile.operations } : {}),
          ...(profile?.language ? { language: profile.language } : {}),
        }).then(newUser => {
          if (newUser?.name) setProfileName(newUser.name);
        });
      }
    }).catch(() => {});
  }, [authUser]);

  /* ═══ Launchpad Check-in Reminder ═══ */
  useEffect(() => {
    if (!authUser) { setShowCheckinReminder(false); return; }
    const checkLaunchpad = async () => {
      try {
        const supabase = createSupabaseBrowser();
        const { data: project } = await supabase
          .from("launchpad_projects")
          .select("id, updated_at")
          .eq("user_id", authUser.id)
          .in("status", ["tracking", "launch", "blueprint"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();
        if (project) {
          const daysSince = (Date.now() - new Date(project.updated_at).getTime()) / 86400000;
          if (daysSince >= 7) setShowCheckinReminder(true);
        }
      } catch {}
    };
    checkLaunchpad();
  }, [authUser]);

  /* ═══ Load Conversations ═══ */
  useEffect(() => {
    if (!authUser) {
      // Not logged in — use localStorage
      setConversations(localGetConversations() as any as Conversation[]);
      setConversationId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      const convs = await fetchConversationsDB(authUser.id);
      if (!cancelled) {
        setConversations(convs.length > 0 ? convs : localGetConversations() as any as Conversation[]);
        setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser]);

  /* ═══ Load Conversation Messages ═══ */
  const loadConversation = useCallback(async (convId: string) => {
    if (convId === conversationId) return;
    setConversationId(convId);
    setMessages([]);
    setLoading(true);
    try {
      if (authUser) {
        const dbMessages = await fetchMessagesDB(convId);
        if (dbMessages.length > 0) {
          setMessages(dbMessages.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
          })));
          setLoading(false);
          return;
        }
      }
      // Fallback to localStorage
      const localMsgs = localGetMessages(convId);
      setMessages(localMsgs.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
      })));
    } catch {
      const localMsgs = localGetMessages(convId);
      setMessages(localMsgs.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
      })));
    }
    setLoading(false);
  }, [conversationId, authUser]);

  /* ═══ Retry Effect — sends after messages state is updated ═══ */
  useEffect(() => {
    if (retryRef.current && !loading) {
      const { text } = retryRef.current;
      retryRef.current = null;
      send(text);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  /* ═══ Dynamic Page Title ═══ */
  useEffect(() => {
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg && firstUserMsg.content) {
      const preview = firstUserMsg.content.slice(0, 50).trim();
      document.title = `${preview}${firstUserMsg.content.length > 50 ? "…" : ""} — Signux`;
    } else {
      document.title = "Signux AI";
    }
  }, [messages]);

  /* ═══ Keyboard Shortcuts Effect ═══ */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      // ⌘K — New chat
      if (meta && e.key === "k") {
        e.preventDefault();
        onNewConversation();
      // ⌘B — Toggle sidebar
      } else if (meta && e.key === "b") {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      // ⌘⇧S — Cycle modes
      } else if (meta && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setMode(prev => {
          const cycle: Mode[] = ["chat", "simulate", "research", "launchpad", "globalops", "invest"];
          const idx = cycle.indexOf(prev);
          return cycle[(idx + 1) % cycle.length];
        });
      // ⌘N — New conversation (alias)
      } else if (meta && e.key === "n") {
        e.preventDefault();
        onNewConversation();
      // / — Focus input (when not typing)
      } else if (e.key === "/" && !meta && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      // Escape — Close settings/sidebar
      } else if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        else if (isMobile && sidebarOpen) setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, lang, addToast, showSettings, isMobile, sidebarOpen]);

  /* ═══ Error Messages ═══ */
  const getErrorMessage = (error: any): string => {
    const msg = error?.message || "";
    if (msg.includes("429")) return "You've reached the message limit. Upgrade to Pro for unlimited messages.";
    if (msg.includes("401")) return "Authentication error. Please sign in again.";
    if (msg.includes("500")) return "Our AI is temporarily overloaded. Please try again in a moment.";
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) return t("chat.connection_error");
    return t("common.error_generic");
  };

  /* ═══ Chat Handler ═══ */
  const send = async (text?: string) => {
    const msg = text || input.trim();
    const currentAttachments = attachments;
    if ((!msg && currentAttachments.length === 0) || loading) return;

    // Build the API content (string or array)
    let apiContent: string | any[];
    if (currentAttachments.length > 0) {
      apiContent = await buildMessageContent(msg, currentAttachments);
    } else {
      apiContent = msg;
    }

    // Build display attachments for the message
    const displayAttachments: Attachment[] = currentAttachments.map(a => ({
      type: a.type,
      name: a.file.name,
      preview: a.preview,
      size: a.file.size,
    }));

    const now = Date.now();
    const userMsg: Message = {
      role: "user",
      content: msg,
      timestamp: now,
      ...(displayAttachments.length > 0 ? { attachments: displayAttachments } : {}),
    };

    // Build the API message with the actual content blocks
    const apiMsg = { role: "user", content: apiContent };

    const newDisplayMessages = [...messages, userMsg];
    const newApiMessages = [...messages.map(m => ({ role: m.role, content: m.content }))];
    // Replace the last display message's content with the API version if it had attachments
    // Actually, we need to track API messages separately for ones with attachments
    // Simpler: build API messages from all previous (text-only) + current (multimodal)
    const apiMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      apiMsg,
    ];

    setMessages(newDisplayMessages);
    setInput("");
    setAttachments([]);
    setLoading(true);
    setSearching(false);
    setMessages([...newDisplayMessages, { role: "assistant", content: "" }]);

    // Create conversation on first message (non-blocking)
    let activeConvId = conversationId;
    if (!activeConvId) {
      if (authUser) {
        // Logged in → try Supabase
        try {
          const conv = await createConversationDB(authUser.id, activeProjectId || undefined);
          if (conv) {
            activeConvId = conv.id;
            setConversationId(conv.id);
            setConversations(prev => [conv, ...prev]);
          }
        } catch {}
      }
      // Fallback or not logged in → localStorage
      if (!activeConvId) {
        const localConv = localCreateConversation(mode);
        activeConvId = localConv.id;
        setConversationId(localConv.id);
        setConversations(prev => [localConv as any as Conversation, ...prev]);
      }
    }

    // Save user message (non-blocking)
    if (activeConvId) {
      if (authUser) saveMessageDB(activeConvId, "user", msg).catch(() => {});
      localSaveMessage(activeConvId, "user", msg);
    }

    try {
      abortRef.current = new AbortController();
      const res = await signuxFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, profile: getProfile(), projectId: activeProjectId }),
        signal: abortRef.current.signal,
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
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // User cancelled — remove empty assistant message
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
          return prev;
        });
        setLoading(false);
        setSearching(false);
        return;
      }
      const errorMsg = getErrorMessage(err);
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: errorMsg, isError: true } as any;
        return u;
      });
    }
    // Stamp assistant message with completion timestamp
    setMessages(prev => {
      const u = [...prev];
      const last = u[u.length - 1];
      if (last && last.role === "assistant") {
        u[u.length - 1] = { ...last, timestamp: Date.now() };
      }
      return u;
    });

    // Persist assistant message + update title (non-blocking)
    if (activeConvId) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content) {
          if (authUser) saveMessageDB(activeConvId!, "assistant", last.content).catch(() => {});
          localSaveMessage(activeConvId!, "assistant", last.content);
        }
        return prev;
      });
      // Generate title from first user message if conversation is new
      const isFirstMessage = newDisplayMessages.filter(m => m.role === "user").length === 1;
      if (isFirstMessage) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          const responseText = lastMsg?.role === "assistant" ? lastMsg.content : "";
          generateSmartTitle(msg, responseText).then(title => {
            if (authUser) updateTitleDB(activeConvId!, title).catch(() => {});
            localUpdateConversationTitle(activeConvId!, title);
            setConversations(prev2 => prev2.map(c => c.id === activeConvId ? { ...c, title } : c));
          });
          return prev;
        });
      } else {
        if (authUser) touchConvDB(activeConvId).catch(() => {});
        localTouchConversation(activeConvId);
      }

      // Auto-summarize project every 5 conversations
      if (activeProjectId && isFirstMessage) {
        const projectConvCount = conversations.filter((c: any) => c.project_id === activeProjectId).length + 1;
        if (projectConvCount % 5 === 0) {
          signuxFetch("/api/projects/summarize", {
            method: "POST",
            body: JSON.stringify({ projectId: activeProjectId }),
          }).catch(() => {});
        }
      }
    }

    setLoading(false);
    setSearching(false);
    inputRef.current?.focus();
  };

  /* ═══ Simulate Handler ═══ */
  const simulate = async (scenarioOverride?: string) => {
    const sc = scenarioOverride || simScenario;
    if (!sc.trim()) return;
    if (scenarioOverride) setSimScenario(scenarioOverride);
    setSimStarting(true);
    await new Promise(r => setTimeout(r, 600));
    setSimStarting(false);
    setSimulating(true);
    setSimResult(null);
    setSimLiveAgents([]);
    setSimTotalAgents(0);
    setSimStage(0);
    setSimAgentMessages([]);
    setSimStartTime(Date.now());
    try {
      const res = await signuxFetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: sc, context: getProfile() }),
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
            else if (data.type === "agent_done") {
                setSimLiveAgents(prev => prev.map(a => a.name === data.agentName && !a.done ? { ...a, done: true } : a));
                setSimAgentMessages(prev => [...prev, data]);
              }
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

  /* ═══ Continue Research in Chat ═══ */
  const continueResearchInChat = (researchReport: string) => {
    setMode("chat");
    const context = `Based on this research report, I have a follow-up question:\n\n${researchReport.slice(0, 2000)}`;
    setTimeout(() => send(context), 200);
  };

  /* ═══ Decision Auto-save ═══ */
  const handleDecisionDetected = useCallback(async (decision: Record<string, string>, confidence: string) => {
    if (!authUser || !conversationId) return;
    try {
      const supabase = createSupabaseBrowser();
      await supabase.from("decision_journal").insert({
        user_id: authUser.id,
        conversation_id: conversationId,
        decision_summary: decision.summary || "Untitled decision",
        decision_category: decision.category || "other",
        ai_recommendation: decision.recommendation || "",
        ai_confidence: confidence || "MEDIUM",
        follow_up_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch {
      // Non-blocking — silently fail
    }
  }, [authUser, conversationId]);

  /* ═══ Copy Handler ═══ */
  const handleCopy = (_text: string) => {
    // Clipboard write already handled by MessageBlock; just show toast
    addToast(t("chat.copied"), "success");
  };

  /* ═══ Retry Handler — auto-resend ═══ */
  const onRetry = () => {
    if (messages.length < 2 || loading) return;
    const lastUser = messages[messages.length - 2];
    if (lastUser.role !== "user") return;
    const retryText = lastUser.content;
    // Remove both the AI response AND the user message, then re-send
    const history = messages.slice(0, -2);
    retryRef.current = { text: retryText, history };
    setMessages(history);
  };

  /* ═══ New Conversation ═══ */
  const onNewConversation = () => {
    if (mode === "chat") {
      setMessages([]);
      setAttachments([]);
      setConversationId(null);
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
    setSimAgentMessages([]);
    setSimStartTime(null);
  };

  /* ═══ Delete Conversation ═══ */
  const handleDeleteConversation = useCallback(async (convId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (conversationId === convId) {
      setConversationId(null);
      setMessages([]);
    }
    if (authUser) removeConversationDB(convId).catch(() => {});
    localDeleteConversation(convId);
  }, [conversationId, authUser]);

  /* ═══ Tier Access Check ═══ */
  const MODE_TIER: Record<string, string[]> = {
    chat: ["free", "pro", "max", "founding"],
    simulate: ["pro", "max", "founding"],
    research: ["pro", "max", "founding"],
    launchpad: ["pro", "max", "founding"],
    globalops: ["max", "founding"],
    invest: ["max", "founding"],
  };
  const canAccessMode = (m: string) => {
    const allowed = MODE_TIER[m] || ["free"];
    return allowed.includes(tier);
  };
  const getRequiredTier = (m: string) => {
    if (["globalops", "invest"].includes(m)) return "max";
    return "pro";
  };

  /* Close sidebar on mobile */
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  /* ═══ Render ═══ */
  if (!ready) return null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <OfflineBanner />

      {/* Auth header — top-right, always visible */}
      {!authUser ? (
        <div style={{
          position: "fixed", top: 0, right: 0,
          height: 56, display: "flex", alignItems: "center",
          padding: "0 20px", gap: 12, zIndex: 50,
        }}>
          <button
            onClick={() => { window.location.href = "/login"; }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 500, color: "var(--text-secondary)",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
          >
            Log in
          </button>
          <button
            onClick={() => { window.location.href = "/signup"; }}
            style={{
              background: "var(--text-primary)", color: "var(--bg-primary)",
              border: "none", borderRadius: 20, padding: "8px 20px",
              cursor: "pointer", fontSize: 14, fontWeight: 600,
              fontFamily: "var(--font-brand)", letterSpacing: 1,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Start free
          </button>
        </div>
      ) : (
        <UserMenu user={authUser} onSignOut={authSignOut} />
      )}

      <Sidebar
        mode={mode}
        setMode={setMode}
        profileName={profileName}
        lang={lang}
        onNewConversation={onNewConversation}
        onOpenSettings={() => setShowSettings(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        isLoggedIn={isLoggedIn}
        onSignOut={authUser ? authSignOut : undefined}
        isMobile={isMobile}
        authUser={authUser}
        conversations={activeProjectId
          ? conversations.filter((c: any) => c.project_id === activeProjectId)
          : conversations}
        loadingHistory={loadingHistory}
        activeConversationId={conversationId}
        onLoadConversation={loadConversation}
        onDeleteConversation={handleDeleteConversation}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={selectProject}
        onCreateProject={(name) => createProject(name)}
        onOpenKnowledge={() => setShowKnowledge(true)}
      />

      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: "var(--bg-primary)", minWidth: 0, minHeight: 0, overflow: "hidden",
      }}>
        {/* Launchpad check-in reminder */}
        {showCheckinReminder && (
          <div
            onClick={() => { setMode("launchpad"); setShowCheckinReminder(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px", margin: "8px 16px",
              borderRadius: 10, background: "var(--mode-lp-bg, rgba(20,184,166,0.06))",
              border: "1px solid var(--mode-lp-border, rgba(20,184,166,0.15))",
              fontSize: 13, color: "var(--mode-lp, #14B8A6)",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>
            <span style={{ flex: 1 }}>Your weekly check-in is due</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>Open Launchpad &rarr;</span>
            <button onClick={(e) => { e.stopPropagation(); setShowCheckinReminder(false); }} style={{
              background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 2,
              fontSize: 14, lineHeight: 1,
            }}>
              &#x2715;
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {mode !== "chat" && !canAccessMode(mode) ? (
            <motion.div
              key="paywall"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, minHeight: 0 }}
            >
              <Paywall requiredTier={getRequiredTier(mode)} />
            </motion.div>
          ) : mode === "research" ? (
            <motion.div
              key="research"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
            >
              <ResearchView
                lang={lang}
                onContinueInChat={continueResearchInChat}
                onSetMode={setMode}
                isLoggedIn={isLoggedIn}
              />
            </motion.div>
          ) : mode === "simulate" ? (
            <motion.div
              key="simulate"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
            >
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
                simAgentMessages={simAgentMessages}
                onSetMode={setMode}
                lang={lang}
                isLoggedIn={isLoggedIn}
              />
            </motion.div>
          ) : mode === "launchpad" ? (
            <motion.div
              key="launchpad"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
            >
              <LaunchpadView lang={lang} userId={authUser?.id} onSetMode={setMode} />
            </motion.div>
          ) : mode === "globalops" ? (
            <motion.div
              key="globalops"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
            >
              <GlobalOpsView lang={lang} onSetMode={setMode} />
            </motion.div>
          ) : mode === "invest" ? (
            <motion.div
              key="invest"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
            >
              <InvestView lang={lang} onSetMode={setMode} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
            >
              {showOnboarding && messages.length === 0 ? (
                <Onboarding
                  onComplete={(m) => { localStorage.setItem("signux_onboarded", "true"); setShowOnboarding(false); setMode(m); }}
                  onSkip={() => { localStorage.setItem("signux_onboarded", "true"); setShowOnboarding(false); }}
                />
              ) : (
              <>
              {tier === "free" && isLoggedIn && limits.chat_daily < Infinity && (
                <div style={{
                  fontSize: 11, color: "var(--text-tertiary)", textAlign: "center",
                  padding: "6px 0 0",
                }}>
                  {usage.chat_today} of {limits.chat_daily} free messages today
                  <span
                    onClick={() => window.location.href = "/pricing"}
                    style={{ color: "var(--accent)", cursor: "pointer", marginLeft: 8, fontWeight: 600 }}
                  >
                    Upgrade
                  </span>
                </div>
              )}
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
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                onToast={addToast}
                onSwitchToSimulate={() => setMode("simulate")}
                onSwitchToResearch={() => setMode("research")}
                onSwitchMode={setMode}
                onStop={() => abortRef.current?.abort()}
                lang={lang}
                mode={mode}
                onDecisionDetected={handleDecisionDetected}
              />
              </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onLanguageChange={(newLang) => { setLang(newLang); }}
          onNameChange={(newName) => { setProfileName(newName); }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {showKnowledge && activeProjectId && authUser && (
        <ProjectKnowledge
          projectId={activeProjectId}
          userId={authUser.id}
          onClose={() => setShowKnowledge(false)}
        />
      )}
    </div>
  );
}
