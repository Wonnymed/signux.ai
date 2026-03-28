export type ShortcutCategory = 'global' | 'navigation' | 'conversation' | 'simulation' | 'ui';

export interface Shortcut {
  id: string;
  keys: string;
  keySequence: string[];
  label: string;
  description?: string;
  category: ShortcutCategory;
  action: string;
  allowInInput?: boolean;
  global?: boolean;
}

// ═══ ALL SHORTCUTS ═══

export const SHORTCUTS: Shortcut[] = [
  // ─── GLOBAL ───
  {
    id: 'cmd-k',
    keys: '⌘K',
    keySequence: ['Meta+k'],
    label: 'Command Palette',
    description: 'Search everything',
    category: 'global',
    action: 'command-palette',
    allowInInput: true,
  },
  {
    id: 'cmd-n',
    keys: '⌘N',
    keySequence: ['Meta+n'],
    label: 'New conversation',
    description: 'Start a fresh decision',
    category: 'global',
    action: 'new-conversation',
    allowInInput: true,
  },
  {
    id: 'escape',
    keys: 'Esc',
    keySequence: ['Escape'],
    label: 'Close',
    description: 'Close modal, palette, or panel',
    category: 'global',
    action: 'close-modal',
    allowInInput: true,
  },
  {
    id: 'question-mark',
    keys: '?',
    keySequence: ['?'],
    label: 'Show shortcuts',
    description: 'This overlay',
    category: 'global',
    action: 'show-shortcuts',
  },

  // ─── NAVIGATION (G prefix) ───
  {
    id: 'g-h',
    keys: 'G→H',
    keySequence: ['g', 'h'],
    label: 'Go to Home',
    description: 'Navigate to /c',
    category: 'navigation',
    action: 'navigate-home',
  },
  {
    id: 'g-s',
    keys: 'G→S',
    keySequence: ['g', 's'],
    label: 'Go to Settings',
    description: 'Open settings panel',
    category: 'navigation',
    action: 'navigate-settings',
  },
  {
    id: 'g-p',
    keys: 'G→P',
    keySequence: ['g', 'p'],
    label: 'Go to Profile',
    description: 'Behavioral parameters',
    category: 'navigation',
    action: 'navigate-profile',
  },
  {
    id: 'g-1',
    keys: 'G→1',
    keySequence: ['g', '1'],
    label: 'Filter: Investment',
    description: 'Show investment decisions',
    category: 'navigation',
    action: 'filter-investment',
  },
  {
    id: 'g-2',
    keys: 'G→2',
    keySequence: ['g', '2'],
    label: 'Filter: Career',
    description: 'Show career decisions',
    category: 'navigation',
    action: 'filter-career',
  },
  {
    id: 'g-3',
    keys: 'G→3',
    keySequence: ['g', '3'],
    label: 'Filter: Business',
    description: 'Show business decisions',
    category: 'navigation',
    action: 'filter-business',
  },

  // ─── CONVERSATION ───
  {
    id: 'c-key',
    keys: 'C',
    keySequence: ['c'],
    label: 'New conversation',
    description: 'Create new from sidebar',
    category: 'conversation',
    action: 'new-conversation',
  },
  {
    id: 'slash',
    keys: '/',
    keySequence: ['/'],
    label: 'Focus input',
    description: 'Jump to chat input',
    category: 'conversation',
    action: 'focus-input',
  },
  {
    id: 'cmd-enter',
    keys: '⌘↵',
    keySequence: ['Meta+Enter'],
    label: 'Send message',
    description: 'Send current message',
    category: 'conversation',
    action: 'send-message',
    allowInInput: true,
  },
  {
    id: 'cmd-shift-c',
    keys: '⌘⇧C',
    keySequence: ['Meta+Shift+c'],
    label: 'Copy last verdict',
    description: 'Copy verdict link to clipboard',
    category: 'conversation',
    action: 'copy-verdict',
    allowInInput: true,
  },
  {
    id: 'cmd-shift-e',
    keys: '⌘⇧E',
    keySequence: ['Meta+Shift+e'],
    label: 'Expand verdict',
    description: 'Toggle last verdict expanded view',
    category: 'conversation',
    action: 'expand-verdict',
    allowInInput: true,
  },

  // ─── SIMULATION ───
  {
    id: 's-key',
    keys: 'S',
    keySequence: ['s'],
    label: 'Start Specialist sim',
    description: 'Select Specialist mode and start simulation',
    category: 'simulation',
    action: 'start-specialist-sim',
  },
  {
    id: 'cmd-shift-s',
    keys: '⌘⇧S',
    keySequence: ['Meta+Shift+s'],
    label: 'Start Compare sim',
    description: 'Select Compare mode and start simulation',
    category: 'simulation',
    action: 'start-compare-sim',
    allowInInput: true,
  },

  // ─── UI ───
  {
    id: 'cmd-b',
    keys: '⌘B',
    keySequence: ['Meta+b'],
    label: 'Toggle sidebar',
    description: 'Show or hide the sidebar (Ctrl+B on Windows)',
    category: 'ui',
    action: 'toggle-sidebar',
    allowInInput: true,
  },
  {
    id: 'bracket',
    keys: '[',
    keySequence: ['['],
    label: 'Toggle sidebar',
    description: 'Collapse/expand sidebar (alternate)',
    category: 'ui',
    action: 'toggle-sidebar',
  },
  {
    id: 'd-key',
    keys: 'D',
    keySequence: ['d'],
    label: 'Toggle dark mode',
    description: 'Switch theme',
    category: 'ui',
    action: 'toggle-theme',
  },
  {
    id: 'cmd-comma',
    keys: '⌘,',
    keySequence: ['Meta+,'],
    label: 'Settings',
    description: 'Open settings',
    category: 'ui',
    action: 'open-settings',
    allowInInput: true,
  },
  {
    id: 'cmd-f',
    keys: '⌘F',
    keySequence: ['Meta+f'],
    label: 'Search conversations',
    description: 'Fuzzy search sidebar',
    category: 'ui',
    action: 'search-conversations',
    allowInInput: true,
  },
];

// ═══ HELPERS ═══

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  global: 'Global',
  navigation: 'Navigation',
  conversation: 'Conversation',
  simulation: 'Simulation',
  ui: 'Interface',
};

export function getShortcutsByCategory(): Record<ShortcutCategory, Shortcut[]> {
  const grouped: Record<ShortcutCategory, Shortcut[]> = {
    global: [], navigation: [], conversation: [], simulation: [], ui: [],
  };
  for (const s of SHORTCUTS) {
    grouped[s.category].push(s);
  }
  return grouped;
}

export function getShortcutById(id: string): Shortcut | undefined {
  return SHORTCUTS.find(s => s.id === id);
}
