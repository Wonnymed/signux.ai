import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  initialize: () => void;
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

const THEME_STORAGE_KEYS = ['octux_theme', 'octux:theme'] as const;

function readStoredThemeMode(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  for (const key of THEME_STORAGE_KEYS) {
    const raw = localStorage.getItem(key) as ThemeMode | null;
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  }
  return null;
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', resolved === 'dark' ? '#0D0D0C' : '#FAF7F2');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: 'dark',

  setMode: (mode) => {
    set({ mode });
    if (typeof window === 'undefined') return;
    localStorage.setItem('octux_theme', mode);
    localStorage.setItem('octux:theme', mode);
    const resolved = resolveTheme(mode);
    applyThemeToDOM(resolved);
    set({ resolved });
  },

  initialize: () => {
    if (typeof window === 'undefined') return;

    const mode = readStoredThemeMode() || 'system';
    const resolved = resolveTheme(mode);
    applyThemeToDOM(resolved);
    set({ mode, resolved });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (get().mode === 'system') {
        const r = resolveTheme('system');
        applyThemeToDOM(r);
        set({ resolved: r });
      }
    };
    mq.addEventListener('change', onChange);
  },
}));
