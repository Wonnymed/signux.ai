"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getProfile, updateProfile } from "../lib/profile";
import { ALL_LANGUAGES, LanguageInfo, t, setLanguage, isRTL } from "../lib/i18n";

const OPERATION_KEYS = [
  "onboarding.operations.import_export",
  "onboarding.operations.offshore",
  "onboarding.operations.crypto",
  "onboarding.operations.digital_services",
  "onboarding.operations.ecommerce",
  "onboarding.operations.investments",
  "onboarding.operations.other",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 15,
  color: "var(--text-primary)",
  background: "var(--bg-primary)",
  border: "1px solid var(--border-primary)",
  borderRadius: "var(--radius-sm)",
  outline: "none",
  transition: "border-color 0.2s",
};

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: "easeIn" } },
};

/* ═══ Step 1 — Language Selection ═══ */
function StepLanguage({ onSelect }: { onSelect: (code: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_LANGUAGES;
    const q = search.toLowerCase();
    return ALL_LANGUAGES.filter(
      l => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <motion.div key="step-lang" variants={pageVariants} initial="initial" animate="animate" exit="exit"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}>

      {/* Logo */}
      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Signux</div>

      {/* Title */}
      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)" }}>
        Choose your language
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search languages..."
        style={{ ...inputStyle, maxWidth: 400 }}
      />

      {/* Language grid — text only, no flags */}
      <div style={{
        width: "100%", maxHeight: 440, overflowY: "auto",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
      }}>
        {filtered.map(lang => {
          const isHovered = hovered === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              onMouseEnter={() => setHovered(lang.code)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "12px 8px", borderRadius: "var(--radius-sm)",
                border: isHovered ? "1px solid var(--accent)" : "1px solid transparent",
                background: isHovered ? "var(--bg-hover)" : "transparent",
                cursor: "pointer", fontSize: 14, color: "var(--text-primary)",
                transition: "all 0.15s", fontWeight: 400,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lang.nativeName}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══ Step 2 — Profile Form ═══ */
function StepProfile({ langCode, onSubmit }: { langCode: string; onSubmit: (data: { email: string; name: string; taxResidence: string; operations: string[] }) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [taxResidence, setTaxResidence] = useState("");
  const [operations, setOperations] = useState<string[]>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isValid = EMAIL_RE.test(email) && name.trim().length > 0;

  function toggleOp(key: string) {
    setOperations(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({ email: email.trim(), name: name.trim(), taxResidence: taxResidence.trim(), operations });
  }

  return (
    <motion.div key="step-profile" variants={pageVariants} initial="initial" animate="animate" exit="exit"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", direction: isRTL(langCode) ? "rtl" : "ltr" }}>

      {/* Logo + tagline */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Signux</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{t("onboarding.subtitle")}</div>
      </div>

      {/* Headline */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
          {t("onboarding.welcome")}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
            {t("onboarding.email")}
          </label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
            style={{ ...inputStyle, borderColor: focusedField === "email" ? "var(--accent)" : "var(--border-primary)" }}
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
            {t("onboarding.name")}
          </label>
          <input
            type="text" required value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)}
            style={{ ...inputStyle, borderColor: focusedField === "name" ? "var(--accent)" : "var(--border-primary)" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
            {t("onboarding.country")}
          </label>
          <input
            type="text" value={taxResidence}
            onChange={e => setTaxResidence(e.target.value)}
            onFocus={() => setFocusedField("country")} onBlur={() => setFocusedField(null)}
            style={{ ...inputStyle, borderColor: focusedField === "country" ? "var(--accent)" : "var(--border-primary)" }}
            placeholder={t("onboarding.country_placeholder")}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>
            {t("onboarding.operations")}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {OPERATION_KEYS.map(key => {
              const selected = operations.includes(key);
              return (
                <button
                  key={key} type="button" onClick={() => toggleOp(key)}
                  style={{
                    padding: "8px 14px", borderRadius: 20, fontSize: 13,
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--border-primary)",
                    background: selected ? "var(--accent-bg)" : "transparent",
                    color: selected ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer", transition: "all 0.15s", fontWeight: selected ? 500 : 400,
                  }}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit" disabled={!isValid}
          style={{
            width: "100%", padding: "14px 0", borderRadius: "var(--radius-md)",
            border: "none", fontSize: 15, fontWeight: 600,
            background: isValid ? "var(--accent)" : "var(--border-primary)",
            color: isValid ? "#FFFFFF" : "var(--text-tertiary)",
            cursor: isValid ? "pointer" : "not-allowed",
            transition: "all 0.2s", marginTop: 4,
          }}
        >
          {t("onboarding.start")}
        </button>

        <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>
          {t("onboarding.terms")}
        </p>
      </form>
    </motion.div>
  );
}

/* ═══ Main Onboarding Page ═══ */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "language" | "profile">("loading");
  const [langCode, setLangCode] = useState("en");

  useEffect(() => {
    const profile = getProfile();
    if (profile && profile.name && profile.email) {
      router.replace("/chat");
    } else {
      setStep("language");
    }
  }, [router]);

  function handleLanguageSelect(code: string) {
    setLangCode(code);
    setLanguage(code);
    setStep("profile");
  }

  function handleProfileSubmit(data: { email: string; name: string; taxResidence: string; operations: string[] }) {
    updateProfile({
      email: data.email,
      name: data.name,
      taxResidence: data.taxResidence,
      operations: data.operations,
      language: langCode,
    });

    if (typeof window !== "undefined") {
      sessionStorage.setItem("signux_welcome_toast", JSON.stringify({
        message: t("common.welcome_toast", { name: data.name }),
        type: "success",
      }));
    }

    router.push("/chat");
  }

  if (step === "loading") {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <AnimatePresence mode="wait">
          {step === "language" && <StepLanguage onSelect={handleLanguageSelect} />}
          {step === "profile" && <StepProfile langCode={langCode} onSubmit={handleProfileSubmit} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
