/* ═══════════════════════════════════════════════════════════════
   Signux i18n — All 29 languages hardcoded
   - Global state: setLanguage() / getLanguage() / t()
   - Bridge t() supports both old t(key, lang, params?) and new t(key, params?)
   - RTL support for Arabic (ar) and Hebrew (he)
   ═══════════════════════════════════════════════════════════════ */

/* ═══ Imports ═══ */
import en from "./en";
import ptBR from "./pt-BR";
import es from "./es";
import fr from "./fr";
import de from "./de";
import it from "./it";
import nl from "./nl";
import ru from "./ru";
import zhHans from "./zh-Hans";
import zhHant from "./zh-Hant";
import ja from "./ja";
import ko from "./ko";
import ar from "./ar";
import hi from "./hi";
import tr from "./tr";
import pl from "./pl";
import sv from "./sv";
import da from "./da";
import no from "./no";
import fi from "./fi";
import cs from "./cs";
import ro from "./ro";
import hu from "./hu";
import uk from "./uk";
import el from "./el";
import id from "./id";
import vi from "./vi";
import th from "./th";
import he from "./he";

/* ═══ Types ═══ */
export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
  rtl?: boolean;
}

/* ═══ Language Catalog (29 languages) ═══ */
export const ALL_LANGUAGES: LanguageInfo[] = [
  // Americas
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", region: "americas" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", flag: "🇧🇷", region: "americas" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", region: "americas" },

  // Europe
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", region: "europe" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", region: "europe" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", region: "europe" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", region: "europe" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", region: "europe" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", region: "europe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", region: "europe" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰", region: "europe" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴", region: "europe" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮", region: "europe" },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", region: "europe" },
  { code: "ro", name: "Romanian", nativeName: "Română", flag: "🇷🇴", region: "europe" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", flag: "🇭🇺", region: "europe" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦", region: "europe" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷", region: "europe" },

  // East Asia
  { code: "zh-Hans", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳", region: "east_asia" },
  { code: "zh-Hant", name: "Chinese (Traditional)", nativeName: "繁體中文", flag: "🇹🇼", region: "east_asia" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", region: "east_asia" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", region: "east_asia" },

  // Middle East
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", region: "middle_east", rtl: true },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", region: "middle_east", rtl: true },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", region: "middle_east" },

  // South Asia
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", region: "south_asia" },

  // Southeast Asia
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", region: "southeast_asia" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳", region: "southeast_asia" },
  { code: "th", name: "Thai", nativeName: "ภาษาไทย", flag: "🇹🇭", region: "southeast_asia" },
];

/* ═══ Backward compatibility ═══ */
export const LANGUAGES = ALL_LANGUAGES;

export type Language = typeof ALL_LANGUAGES[number]["code"];

/* ═══ Region metadata ═══ */
export const REGIONS: Record<string, string> = {
  americas: "Americas",
  europe: "Europe",
  east_asia: "East Asia",
  middle_east: "Middle East",
  south_asia: "South Asia",
  southeast_asia: "Southeast Asia",
};

/* ═══ Translations Map ═══ */
export const translations: Record<string, Record<string, string>> = {
  en,
  "pt-BR": ptBR,
  es,
  fr,
  de,
  it,
  nl,
  ru,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  ja,
  ko,
  ar,
  hi,
  tr,
  pl,
  sv,
  da,
  no,
  fi,
  cs,
  ro,
  hu,
  uk,
  el,
  id,
  vi,
  th,
  he,
};

/* ═══ RTL Support ═══ */
const RTL_CODES = new Set(["ar", "he"]);

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
    // Old API: t(key, lang, params?)
    lang = langOrParams;
    finalParams = params;
  } else {
    // New API: t(key, params?)
    lang = currentLanguage;
    finalParams = langOrParams;
  }

  // Look up translation: target lang → English fallback → key
  const langTranslations = translations[lang];
  let text = langTranslations?.[key] ?? translations["en"]?.[key] ?? key;

  // Interpolate params
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
    if (!grouped[lang.region]) grouped[lang.region] = [];
    grouped[lang.region].push(lang);
  }
  return grouped;
}

export function getLanguageNameForAPI(code: string): string {
  const info = ALL_LANGUAGES.find(l => l.code === code);
  return info?.name || "English";
}
