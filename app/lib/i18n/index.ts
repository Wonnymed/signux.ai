/* ═══════════════════════════════════════════════════════════════
   Signux i18n — 4 core languages
   - Global state: setLanguage() / getLanguage() / t()
   - Bridge t() supports both old t(key, lang, params?) and new t(key, params?)
   - To add a language: create the translation file and add it here
   ═══════════════════════════════════════════════════════════════ */

/* ═══ Imports ═══ */
import en from "./en";
import ptBR from "./pt-BR";
import es from "./es";
import zhHans from "./zh-Hans";

/* ═══ Types ═══ */
export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

/* ═══ Language Catalog ═══ */
export const ALL_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", flag: "🇧🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "zh-Hans", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳" },
];

/* ═══ Backward compatibility ═══ */
export const LANGUAGES = ALL_LANGUAGES;

export type Language = typeof ALL_LANGUAGES[number]["code"];

/* ═══ Translations Map ═══ */
export const translations: Record<string, Record<string, string>> = {
  en,
  "pt-BR": ptBR,
  es,
  "zh-Hans": zhHans,
};

/* ═══ RTL Support ═══ */
const RTL_CODES = new Set<string>([]);

export function isRTL(code?: string): boolean {
  return RTL_CODES.has(code || currentLanguage);
}

/* ═══ Global Language State ═══ */
let currentLanguage = "en";

export function setLanguage(code: string) {
  currentLanguage = code;
  if (typeof window !== "undefined") {
    document.documentElement.lang = code;
    document.documentElement.dir = isRTL(code) ? "rtl" : "ltr";
  }
}

export function getLanguage(): string {
  return currentLanguage;
}

/* ═══ Bridge t() function ═══
   Supports both:
   - Old API: t(key, lang, params?)
   - New API: t(key, params?)
   Detection: if 2nd arg is string → old API, else new API
   ═══ */
export function t(key: string, langOrParams?: string | Record<string, string>, params?: Record<string, string>): string {
  let lang: string;
  let finalParams: Record<string, string> | undefined;

  if (typeof langOrParams === "string") {
    lang = langOrParams;
    finalParams = params;
  } else {
    lang = currentLanguage;
    finalParams = langOrParams;
  }

  const langTranslations = translations[lang];
  let text = langTranslations?.[key] ?? translations["en"]?.[key] ?? key;

  if (finalParams) {
    for (const [k, v] of Object.entries(finalParams)) {
      text = text.replace(`{${k}}`, v);
    }
  }

  return text;
}

/* ═══ Language helpers ═══ */
export function getLanguageInfo(code: string): LanguageInfo | undefined {
  return ALL_LANGUAGES.find(l => l.code === code);
}

export function getLanguagesByRegion(): Record<string, LanguageInfo[]> {
  const grouped: Record<string, LanguageInfo[]> = {};
  for (const lang of ALL_LANGUAGES) {
    const region = "core";
    if (!grouped[region]) grouped[region] = [];
    grouped[region].push(lang);
  }
  return grouped;
}

export function getLanguageNameForAPI(code: string): string {
  const info = ALL_LANGUAGES.find(l => l.code === code);
  return info?.name || "English";
}
