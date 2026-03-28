export type UserProfile = {
  name: string;
  email: string;
  taxResidence: string;
  language: string;
  operations: string[];
  structures: string[];
  monthlyVolume: string;
  languages: string[];
  interests: string[];
  history: string[];
  aboutYou: string;
  customInstructions: string;
  memoryEnabled: boolean;
  referenceHistory: boolean;
  theme: "auto" | "light" | "dark";
  webSearchEnabled: boolean;
};

const PROFILE_KEY = "signux_profile";

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PROFILE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function updateProfile(updates: Partial<UserProfile>) {
  const current = getProfile() || { name: "", email: "", taxResidence: "", language: "en", operations: [], structures: [], monthlyVolume: "", languages: [], interests: [], history: [], aboutYou: "", customInstructions: "", memoryEnabled: true, referenceHistory: true, theme: "dark" as const, webSearchEnabled: true };
  const updated = { ...current, ...updates };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

export function addToHistory(entry: string) {
  const profile = getProfile();
  if (profile) {
    profile.history = [...(profile.history || []).slice(-20), entry];
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}
