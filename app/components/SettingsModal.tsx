"use client";
import { useState, useEffect } from "react";
import {
  X, Settings, Sliders, User, CreditCard, BarChart3,
  Monitor, Sun, Moon, Shield, Download, Trash2,
  MessageSquare, Brain, History, Target,
} from "lucide-react";
import { t, ALL_LANGUAGES, Language, setLanguage } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { getProfile, updateProfile } from "../lib/profile";

/* ═══ Sub-components ═══ */

function SettingRow({ label, description, icon, children }: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
        }}>
          {icon}
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: 40, height: 22, borderRadius: 11,
      background: checked ? "var(--accent)" : "var(--bg-tertiary)",
      border: `1px solid ${checked ? "var(--accent)" : "var(--border-secondary)"}`,
      position: "relative", cursor: "pointer",
      transition: "all 200ms ease",
      padding: 0,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        background: checked ? "#000" : "var(--text-tertiary)",
        position: "absolute", top: 2,
        left: checked ? 20 : 2,
        transition: "all 200ms ease",
      }} />
    </button>
  );
}

/* ═══ Types ═══ */

type Tab = "general" | "personalize" | "account" | "usage";

type SettingsModalProps = {
  onClose: () => void;
  onLanguageChange: (lang: Language) => void;
  onNameChange: (name: string) => void;
  tier?: string;
  usage?: { chat_today: number; simulations_month: number; researches_month: number; globalops_month: number; invest_month: number };
  limits?: { chat_daily: number; simulate_monthly: number; research_monthly: number; globalops_monthly: number; invest_monthly: number };
};

/* ═══ Main Component ═══ */

export default function SettingsModal({ onClose, onLanguageChange, onNameChange, tier, usage, limits }: SettingsModalProps) {
  const profile = getProfile();
  const [tab, setTab] = useState<Tab>("general");
  const [lang, setLang] = useState<Language>((profile?.language as Language) || "en");
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(profile?.theme || "dark");
  const [webSearch, setWebSearch] = useState(profile?.webSearchEnabled !== false);
  const [aboutYou, setAboutYou] = useState(profile?.aboutYou || "");
  const [customInstructions, setCustomInstructions] = useState(profile?.customInstructions || "");
  const [memoryEnabled, setMemoryEnabled] = useState(profile?.memoryEnabled !== false);
  const [referenceHistory, setReferenceHistory] = useState(profile?.referenceHistory !== false);
  const [name, setName] = useState(profile?.name || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const isMobile = useIsMobile();

  const plan = tier || "free";

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.style.colorScheme = "light";
      root.setAttribute("data-theme", "light");
    } else if (theme === "dark") {
      root.style.colorScheme = "dark";
      root.setAttribute("data-theme", "dark");
    } else {
      root.style.colorScheme = "";
      root.removeAttribute("data-theme");
    }
  }, [theme]);

  function save(updates: Record<string, any>) {
    updateProfile(updates);
  }

  function handleLanguageChange(code: string) {
    setLang(code as Language);
    setLanguage(code as Language);
    save({ language: code });
    onLanguageChange(code as Language);
  }

  function handleThemeChange(t: "auto" | "light" | "dark") {
    setTheme(t);
    save({ theme: t });
  }

  function handleWebSearchToggle(v: boolean) {
    setWebSearch(v);
    save({ webSearchEnabled: v });
  }

  function handleMemoryToggle(v: boolean) {
    setMemoryEnabled(v);
    save({ memoryEnabled: v });
  }

  function handleReferenceHistoryToggle(v: boolean) {
    setReferenceHistory(v);
    save({ referenceHistory: v });
  }

  function handleNameBlur() {
    if (name.trim() && name.trim() !== profile?.name) {
      save({ name: name.trim() });
      onNameChange(name.trim());
    }
  }

  function savePersonalization() {
    save({ aboutYou, customInstructions });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function appendToAboutYou(text: string) {
    setAboutYou(prev => prev ? `${prev}\n${text}` : text);
  }

  function appendToInstructions(text: string) {
    setCustomInstructions(prev => prev ? `${prev}\n${text}` : text);
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Sliders size={13} /> },
    { id: "personalize", label: "Personalize", icon: <User size={13} /> },
    { id: "account", label: "Account", icon: <CreditCard size={13} /> },
    { id: "usage", label: "Usage", icon: <BarChart3 size={13} /> },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--text-primary)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-secondary)",
    borderRadius: 10,
    outline: "none",
    transition: "border-color 0.15s",
    lineHeight: 1.5,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 100,
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed",
        ...(isMobile
          ? { inset: 0 }
          : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        ),
        zIndex: 101,
        width: isMobile ? "100%" : "95vw",
        maxWidth: isMobile ? "100%" : 580,
        maxHeight: isMobile ? "100vh" : "85vh",
        height: isMobile ? "100vh" : undefined,
        borderRadius: isMobile ? 0 : 16,
        background: "var(--bg-primary)",
        border: isMobile ? "none" : "1px solid var(--border-secondary)",
        boxShadow: isMobile ? "none" : "0 24px 48px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: isMobile ? "none" : "scaleIn 0.15s ease-out",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "14px 16px" : "16px 24px",
          borderBottom: "1px solid var(--border-secondary)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Settings size={18} style={{ color: "var(--accent)" }} />
            <span style={{
              fontSize: 16, fontWeight: 700,
              fontFamily: "var(--font-brand)",
              color: "var(--text-primary)",
            }}>
              Settings
            </span>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: "1px solid var(--border-secondary)",
            background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-tertiary)",
            transition: "all 150ms",
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0,
          padding: isMobile ? "0 16px" : "0 24px",
          borderBottom: "1px solid var(--border-secondary)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          flexShrink: 0,
        }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "10px 16px",
              background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === tb.id ? "var(--accent)" : "transparent"}`,
              color: tab === tb.id ? "var(--text-primary)" : "var(--text-tertiary)",
              fontSize: 12, fontWeight: tab === tb.id ? 600 : 400,
              cursor: "pointer", transition: "all 150ms",
              whiteSpace: "nowrap", marginBottom: -1,
            }}>
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: "auto",
          padding: isMobile ? "16px 16px 32px" : "20px 24px 24px",
          paddingBottom: isMobile ? "calc(32px + var(--safe-bottom, 0px))" : 24,
        }}>

          {/* ═══ GENERAL TAB ═══ */}
          {tab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Language */}
              <SettingRow label="Language" description="Interface language">
                <select
                  value={lang}
                  onChange={e => handleLanguageChange(e.target.value)}
                  style={{
                    padding: "8px 32px 8px 12px", borderRadius: 8,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                    color: "var(--text-primary)", fontSize: 13,
                    appearance: "none", cursor: "pointer",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                    outline: "none",
                  }}
                >
                  {ALL_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.nativeName}</option>
                  ))}
                </select>
              </SettingRow>

              {/* Theme */}
              <SettingRow label="Theme" description="Choose your visual preference">
                <div style={{ display: "flex", gap: 6 }}>
                  {([
                    { id: "auto" as const, label: "Auto", icon: <Monitor size={14} /> },
                    { id: "light" as const, label: "Light", icon: <Sun size={14} /> },
                    { id: "dark" as const, label: "Dark", icon: <Moon size={14} /> },
                  ]).map(opt => (
                    <button key={opt.id} onClick={() => handleThemeChange(opt.id)} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${theme === opt.id ? "var(--accent)" : "var(--border-secondary)"}`,
                      background: theme === opt.id ? "rgba(212,175,55,0.06)" : "transparent",
                      color: theme === opt.id ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      transition: "all 150ms",
                    }}>
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </SettingRow>

              {/* Web Search */}
              <SettingRow label="Web search" description="Let Signux search the web for current information">
                <ToggleSwitch checked={webSearch} onChange={handleWebSearchToggle} />
              </SettingRow>

              {/* Keyboard shortcuts */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                  Keyboard shortcuts
                </div>
                <div style={{
                  display: "flex", flexDirection: "column", gap: 6,
                  fontSize: 11, color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {[
                    { label: "New conversation", key: "\u2318 N" },
                    { label: "Search conversations", key: "\u2318 K" },
                    { label: "Settings", key: "\u2318 ," },
                  ].map((shortcut, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                      <span>{shortcut.label}</span>
                      <kbd style={{
                        padding: "2px 6px", borderRadius: 4,
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-secondary)",
                        fontSize: 10,
                      }}>
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PERSONALIZE TAB ═══ */}
          {tab === "personalize" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Your context */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <User size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Your context</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, marginTop: 0 }}>
                  Help Signux understand your business for better answers
                </p>
                <textarea
                  value={aboutYou}
                  onChange={e => setAboutYou(e.target.value)}
                  placeholder="E.g., I'm a Brazilian entrepreneur importing electronics from China, based in Seoul. My annual revenue is $2M."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {["Founder", "Investor", "Executive", "Freelancer"].map(role => (
                    <button key={role} onClick={() => appendToAboutYou(`Role: ${role}`)} style={{
                      padding: "3px 8px", borderRadius: 4,
                      border: "1px dashed var(--border-secondary)",
                      background: "transparent", color: "var(--text-tertiary)",
                      fontSize: 10, cursor: "pointer",
                    }}>
                      + {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response preferences */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MessageSquare size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Response preferences</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, marginTop: 0 }}>
                  How should Signux communicate with you?
                </p>
                <textarea
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                  placeholder="E.g., Always respond in Portuguese. Give me cost breakdowns in USD and BRL. Be direct."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {["Be concise", "Include numbers", "Respond in Portuguese", "Skip disclaimers"].map(pref => (
                    <button key={pref} onClick={() => appendToInstructions(pref)} style={{
                      padding: "3px 8px", borderRadius: 4,
                      border: "1px dashed var(--border-secondary)",
                      background: "transparent", color: "var(--text-tertiary)",
                      fontSize: 10, cursor: "pointer",
                    }}>
                      + {pref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory */}
              <SettingRow
                label="Memory"
                description="Remember information from your conversations"
                icon={<Brain size={14} style={{ color: "var(--accent)" }} />}
              >
                <ToggleSwitch checked={memoryEnabled} onChange={handleMemoryToggle} />
              </SettingRow>

              {/* Reference history */}
              <SettingRow
                label="Reference chat history"
                description="Use previous conversations for context"
                icon={<History size={14} style={{ color: "var(--accent)" }} />}
              >
                <ToggleSwitch checked={referenceHistory} onChange={handleReferenceHistoryToggle} />
              </SettingRow>

              {/* Save button */}
              <button onClick={savePersonalization} style={{
                padding: "10px 20px", borderRadius: 10,
                background: saved ? "rgba(34,197,94,0.15)" : "var(--accent)",
                color: saved ? "#22c55e" : "#000",
                fontSize: 13, fontWeight: 700, border: "none",
                cursor: "pointer", alignSelf: "flex-end",
                transition: "all 200ms",
              }}>
                {saved ? "Saved!" : "Save preferences"}
              </button>
            </div>
          )}

          {/* ═══ ACCOUNT TAB ═══ */}
          {tab === "account" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Profile */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <User size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Profile</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onBlur={handleNameBlur}
                      placeholder="Your name"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Email</label>
                    <input
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      style={{
                        ...inputStyle,
                        background: "var(--bg-tertiary)",
                        color: "var(--text-tertiary)",
                        cursor: "not-allowed",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Subscription */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <CreditCard size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Subscription</span>
                </div>
                <div style={{
                  padding: "14px 18px", borderRadius: 12,
                  border: "1px solid var(--border-secondary)",
                  background: "var(--bg-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                        {plan === "free" ? "Free" : plan === "pro" ? "Pro" : plan === "max" ? "Max" : plan === "founding" ? "Founding" : "Free"}
                      </span>
                      {plan !== "free" && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 9,
                          background: "rgba(212,175,55,0.1)", color: "var(--accent)",
                          fontWeight: 700, letterSpacing: 0.5,
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {plan === "free" ? "5 messages/day" : plan === "pro" ? "$29/month" : "$99/month"}
                    </span>
                  </div>
                  {plan === "free" ? (
                    <a href="/pricing" style={{
                      padding: "8px 18px", borderRadius: 50,
                      background: "var(--accent)", color: "#000",
                      fontSize: 12, fontWeight: 700, border: "none",
                      cursor: "pointer", textDecoration: "none",
                      display: "inline-flex",
                    }}>
                      Upgrade
                    </a>
                  ) : (
                    <button onClick={() => { window.location.href = "/pricing"; }} style={{
                      padding: "8px 18px", borderRadius: 50,
                      border: "1px solid var(--border-secondary)",
                      background: "transparent", color: "var(--text-secondary)",
                      fontSize: 12, cursor: "pointer",
                    }}>
                      Manage billing
                    </button>
                  )}
                </div>
              </div>

              {/* Data & Privacy */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Shield size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Data & Privacy</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={() => {
                    const data = JSON.stringify(getProfile(), null, 2);
                    const blob = new Blob([data], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "signux-data.json"; a.click();
                    URL.revokeObjectURL(url);
                  }} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: 10,
                    border: "1px solid var(--border-secondary)",
                    background: "transparent", color: "var(--text-secondary)",
                    fontSize: 12, cursor: "pointer", textAlign: "left",
                    width: "100%",
                  }}>
                    <Download size={14} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>Export my data</div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Download your profile and preferences</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Danger zone */}
              <div style={{
                padding: "14px 18px", borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.15)",
                background: "rgba(239,68,68,0.03)",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "#ef4444",
                  fontFamily: "var(--font-mono)", letterSpacing: 1,
                  textTransform: "uppercase", marginBottom: 8,
                }}>
                  Danger zone
                </div>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 8,
                    border: "1px solid rgba(239,68,68,0.2)",
                    background: "transparent", color: "#ef4444",
                    fontSize: 12, cursor: "pointer",
                  }}>
                    <Trash2 size={13} />
                    Delete my account
                  </button>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, marginTop: 0 }}>
                      This will permanently delete your account, all conversations, analyses, and data. This cannot be undone.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => {
                        localStorage.clear();
                        window.location.href = "/onboarding";
                      }} style={{
                        padding: "6px 14px", borderRadius: 6,
                        background: "#ef4444", color: "#fff",
                        fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                      }}>
                        Yes, delete everything
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{
                        padding: "6px 14px", borderRadius: 6,
                        background: "transparent", color: "var(--text-secondary)",
                        fontSize: 11, border: "1px solid var(--border-secondary)", cursor: "pointer",
                      }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ USAGE TAB ═══ */}
          {tab === "usage" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Usage this month */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <BarChart3 size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Usage this period</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    {
                      label: "Messages today",
                      used: usage?.chat_today || 0,
                      limit: limits?.chat_daily || 5,
                      color: "var(--accent)",
                    },
                    {
                      label: "Simulations this month",
                      used: usage?.simulations_month || 0,
                      limit: limits?.simulate_monthly || 1,
                      color: "#D4AF37",
                    },
                    {
                      label: "Intel reports this month",
                      used: usage?.researches_month || 0,
                      limit: limits?.research_monthly || 0,
                      color: "#ef4444",
                    },
                    {
                      label: "Global Ops this month",
                      used: usage?.globalops_month || 0,
                      limit: limits?.globalops_monthly || 0,
                      color: "#8B5CF6",
                    },
                    {
                      label: "Invest this month",
                      used: usage?.invest_month || 0,
                      limit: limits?.invest_monthly || 0,
                      color: "#3B82F6",
                    },
                  ].filter(item => item.limit > 0 || item.used > 0).map((item, i) => (
                    <div key={i}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: 12, marginBottom: 4,
                      }}>
                        <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                        <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                          {item.used} / {item.limit === 0 ? "\u221E" : item.limit}
                        </span>
                      </div>
                      <div style={{
                        height: 4, borderRadius: 2,
                        background: "var(--bg-tertiary)",
                      }}>
                        <div style={{
                          height: "100%", borderRadius: 2,
                          background: item.color,
                          width: item.limit > 0
                            ? `${Math.min((item.used / item.limit) * 100, 100)}%`
                            : "3%",
                          transition: "width 500ms ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {plan === "free" && (
                  <div style={{
                    marginTop: 12, padding: "10px 14px", borderRadius: 10,
                    background: "rgba(212,175,55,0.04)",
                    border: "1px solid rgba(212,175,55,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Need more? Upgrade to Pro
                    </span>
                    <a href="/pricing" style={{
                      padding: "5px 14px", borderRadius: 50,
                      background: "var(--accent)", color: "#000",
                      fontSize: 11, fontWeight: 600, textDecoration: "none",
                      display: "inline-flex",
                    }}>
                      {`$29/mo \u2192`}
                    </a>
                  </div>
                )}
              </div>

              {/* Plan details */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Target size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Your plan</span>
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                }}>
                  {[
                    { label: "Plan", value: plan === "free" ? "Free" : plan === "pro" ? "Pro" : plan === "max" ? "Max" : plan === "founding" ? "Founding" : "Free" },
                    { label: "Messages/day", value: limits?.chat_daily === 0 ? "\u221E" : String(limits?.chat_daily || 5) },
                    { label: "Simulations/mo", value: limits?.simulate_monthly === 0 ? "\u221E" : String(limits?.simulate_monthly || 1) },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      padding: "12px 10px", borderRadius: 10, textAlign: "center",
                      border: "1px solid var(--border-secondary)",
                      background: "var(--bg-secondary)",
                    }}>
                      <div style={{
                        fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
