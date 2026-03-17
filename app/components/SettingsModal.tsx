"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { t, ALL_LANGUAGES, Language, setLanguage } from "../lib/i18n";
import { getProfile, updateProfile } from "../lib/profile";
import { resetTour } from "./OnboardingTour";

type Tab = "general" | "personalization" | "account";

type SettingsModalProps = {
  onClose: () => void;
  onLanguageChange: (lang: Language) => void;
  onNameChange: (name: string) => void;
};

export default function SettingsModal({ onClose, onLanguageChange, onNameChange }: SettingsModalProps) {
  const profile = getProfile();
  const [tab, setTab] = useState<Tab>("general");
  const [lang, setLang] = useState<Language>((profile?.language as Language) || "en");
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(profile?.theme || "auto");
  const [webSearch, setWebSearch] = useState(profile?.webSearchEnabled !== false);
  const [aboutYou, setAboutYou] = useState(profile?.aboutYou || "");
  const [customInstructions, setCustomInstructions] = useState(profile?.customInstructions || "");
  const [memoryEnabled, setMemoryEnabled] = useState(profile?.memoryEnabled !== false);
  const [referenceHistory, setReferenceHistory] = useState(profile?.referenceHistory !== false);
  const [name, setName] = useState(profile?.name || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  function handleWebSearchToggle() {
    const next = !webSearch;
    setWebSearch(next);
    save({ webSearchEnabled: next });
  }

  function handleAboutYouBlur() {
    save({ aboutYou });
  }

  function handleCustomInstructionsBlur() {
    save({ customInstructions });
  }

  function handleMemoryToggle() {
    const next = !memoryEnabled;
    setMemoryEnabled(next);
    save({ memoryEnabled: next });
  }

  function handleReferenceHistoryToggle() {
    const next = !referenceHistory;
    setReferenceHistory(next);
    save({ referenceHistory: next });
  }

  function handleNameBlur() {
    if (name.trim() && name.trim() !== profile?.name) {
      save({ name: name.trim() });
      onNameChange(name.trim());
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: t("settings.general") },
    { key: "personalization", label: t("settings.personalization") },
    { key: "account", label: t("settings.account") },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--text-primary)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-secondary)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    border: "none",
    cursor: "pointer",
    position: "relative",
    background: active ? "var(--accent)" : "var(--bg-tertiary)",
    transition: "background 0.2s",
    flexShrink: 0,
  });

  const toggleDotStyle = (active: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 2,
    left: active ? 20 : 2,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#fff",
    transition: "left 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 100, animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 101,
        width: "95vw", maxWidth: 560, maxHeight: "80vh",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-primary)", border: "1px solid var(--border-primary)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        animation: "scaleIn 0.15s ease-out",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px 0",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
            {t("settings.title")}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Horizontal tabs */}
        <div style={{
          display: "flex", gap: 0, padding: "12px 24px 0",
          borderBottom: "1px solid var(--border-secondary)",
        }}>
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                padding: "10px 20px", border: "none", cursor: "pointer",
                fontSize: 13, transition: "all 0.15s", background: "none",
                color: tab === tb.key ? "var(--text-primary)" : "var(--text-tertiary)",
                fontWeight: tab === tb.key ? 500 : 400,
                borderBottom: tab === tb.key ? "2px solid var(--text-primary)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {/* Content */}
          <div style={{
            overflowY: "auto", padding: "20px 24px 24px",
            minHeight: 0, maxHeight: "calc(80vh - 120px)",
          }}>
            {/* GENERAL TAB */}
            {tab === "general" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Language */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                    {t("settings.language")}
                  </label>
                  <select
                    value={lang}
                    onChange={e => handleLanguageChange(e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      paddingRight: 36,
                    }}
                  >
                    {ALL_LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.nativeName} — {l.name}</option>
                    ))}
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                    {t("settings.theme")}
                  </label>
                  <div style={{
                    display: "flex", gap: 0,
                    background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-secondary)", padding: 3,
                  }}>
                    {(["auto", "light", "dark"] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleThemeChange(opt)}
                        style={{
                          flex: 1, padding: "8px 0", borderRadius: 6,
                          border: "none", cursor: "pointer", fontSize: 13,
                          transition: "all 0.15s",
                          background: theme === opt ? "var(--bg-primary)" : "transparent",
                          color: theme === opt ? "var(--text-primary)" : "var(--text-tertiary)",
                          fontWeight: theme === opt ? 500 : 400,
                          boxShadow: theme === opt ? "var(--shadow-sm)" : "none",
                        }}
                      >
                        {t(`settings.theme_${opt}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Web search */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
                      {t("settings.web_search")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                      {t("settings.web_search_desc")}
                    </div>
                  </div>
                  <button onClick={handleWebSearchToggle} style={toggleStyle(webSearch)}>
                    <div style={toggleDotStyle(webSearch)} />
                  </button>
                </div>

                {/* Replay tutorial */}
                <div style={{ height: 1, background: "var(--border-secondary)" }} />
                <button
                  onClick={() => {
                    resetTour();
                    onClose();
                  }}
                  style={{
                    background: "none", border: "none", color: "var(--accent)",
                    fontSize: 13, cursor: "pointer", padding: 0, textAlign: "left",
                  }}
                >
                  {t("settings.replay_tutorial")}
                </button>
              </div>
            )}

            {/* PERSONALIZATION TAB */}
            {tab === "personalization" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* About you */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                    {t("settings.about_you")}
                  </label>
                  <textarea
                    value={aboutYou}
                    onChange={e => setAboutYou(e.target.value)}
                    onBlur={handleAboutYouBlur}
                    placeholder={t("settings.about_you_placeholder")}
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 100,
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* Custom instructions */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                    {t("settings.custom_instructions")}
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    onBlur={handleCustomInstructionsBlur}
                    placeholder={t("settings.custom_instructions_placeholder")}
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 100,
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* Memory toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
                      {t("settings.memory")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                      {t("settings.memory_desc")}
                    </div>
                  </div>
                  <button onClick={handleMemoryToggle} style={toggleStyle(memoryEnabled)}>
                    <div style={toggleDotStyle(memoryEnabled)} />
                  </button>
                </div>

                {/* Reference history toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
                      {t("settings.reference_history")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                      {t("settings.reference_history_desc")}
                    </div>
                  </div>
                  <button onClick={handleReferenceHistoryToggle} style={toggleStyle(referenceHistory)}>
                    <div style={toggleDotStyle(referenceHistory)} />
                  </button>
                </div>
              </div>
            )}

            {/* ACCOUNT TAB */}
            {tab === "account" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                    {t("settings.name")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    style={inputStyle}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                    {t("settings.email")}
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    style={{
                      ...inputStyle,
                      opacity: 0.6,
                      cursor: "not-allowed",
                    }}
                  />
                </div>

                {/* Plan */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                    {t("settings.plan")}
                  </label>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-sm)", border: "1px solid var(--border-secondary)",
                  }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                        {t("settings.plan_free")}
                      </span>
                    </div>
                    <button style={{
                      padding: "6px 16px", borderRadius: "var(--radius-sm)",
                      background: "var(--accent)", color: "#fff", fontSize: 12,
                      fontWeight: 500, border: "none", cursor: "pointer",
                    }}>
                      {t("settings.upgrade")}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border-secondary)" }} />

                {/* Delete account */}
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      padding: "10px 0", background: "none", border: "none",
                      color: "var(--error)", fontSize: 13, cursor: "pointer",
                      textAlign: "left", fontWeight: 500,
                    }}
                  >
                    {t("settings.delete_account")}
                  </button>
                ) : (
                  <div style={{
                    padding: 16, borderRadius: "var(--radius-sm)",
                    background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--error)", marginBottom: 4 }}>
                      {t("settings.delete_confirm")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.4 }}>
                      {t("settings.delete_confirm_desc")}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{
                          padding: "8px 16px", borderRadius: "var(--radius-sm)",
                          background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
                          color: "var(--text-primary)", fontSize: 12, cursor: "pointer",
                        }}
                      >
                        {t("settings.cancel")}
                      </button>
                      <button
                        onClick={() => {
                          localStorage.clear();
                          window.location.href = "/onboarding";
                        }}
                        style={{
                          padding: "8px 16px", borderRadius: "var(--radius-sm)",
                          background: "var(--error)", border: "none",
                          color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 500,
                        }}
                      >
                        {t("settings.delete")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
