export type CommandType = 'action' | 'conversation' | 'agent' | 'category' | 'recent';

export interface Command {
  id: string;
  type: CommandType;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  category?: string;
  verdictDot?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// ═══ STATIC ACTIONS ═══

export const ACTIONS: Command[] = [
  {
    id: 'action:new-conversation',
    type: 'action',
    label: 'New conversation',
    description: 'Start a fresh decision analysis',
    shortcut: 'C',
    icon: 'plus',
  },
  {
    id: 'action:new-simulation',
    type: 'action',
    label: 'New simulation',
    description: 'Jump straight to Deep simulation',
    shortcut: 'S',
    icon: 'simulate',
  },
  {
    id: 'action:toggle-dark-mode',
    type: 'action',
    label: 'Toggle dark mode',
    description: 'Switch between dark and light theme',
    shortcut: 'D',
    icon: 'theme',
  },
  {
    id: 'action:shortcuts',
    type: 'action',
    label: 'Show keyboard shortcuts',
    description: 'View all available shortcuts',
    shortcut: '?',
    icon: 'keyboard',
  },
  {
    id: 'action:settings',
    type: 'action',
    label: 'Settings',
    description: 'Account, preferences, billing',
    shortcut: ',',
    icon: 'settings',
  },
  {
    id: 'action:switch-tier',
    type: 'action',
    label: 'Switch tier',
    description: 'Change between Ink, Deep, and Kraken',
    shortcut: 'T',
    icon: 'tier',
  },
];

// ═══ CATEGORIES ═══

export const CATEGORIES: Command[] = [
  { id: 'cat:investment', type: 'category', label: 'Investment', description: 'Financial decisions', icon: '\u{1F4B0}', category: 'investment' },
  { id: 'cat:relationships', type: 'category', label: 'Relationships', description: 'People decisions', icon: '\u2764\uFE0F', category: 'relationships' },
  { id: 'cat:career', type: 'category', label: 'Career', description: 'Professional decisions', icon: '\u{1F4BC}', category: 'career' },
  { id: 'cat:business', type: 'category', label: 'Business', description: 'Entrepreneurial decisions', icon: '\u{1F3EA}', category: 'business' },
  { id: 'cat:life', type: 'category', label: 'Life', description: 'Personal decisions', icon: '\u{1F30D}', category: 'life' },
];

// ═══ SEARCH HELPERS ═══

export function fuzzyMatch(query: string, text: string): number {
  if (!query || !text) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (t.includes(q)) return 100 + (q.length / t.length) * 50;

  const words = t.split(/\s+/);
  const wordStartMatch = words.some(w => w.startsWith(q));
  if (wordStartMatch) return 80;

  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10;
      if (ti > 0 && t[ti - 1] === q[qi - 1]) score += 5;
      qi++;
    }
  }

  return qi === q.length ? score : 0;
}

export function searchCommands(
  query: string,
  conversations: Command[],
  agents: Command[],
): Command[] {
  if (!query || query.length < 1) return [];

  const allCommands = [...ACTIONS, ...CATEGORIES, ...conversations, ...agents];
  const scored = allCommands
    .map(cmd => {
      const labelScore = fuzzyMatch(query, cmd.label);
      const descScore = fuzzyMatch(query, cmd.description || '') * 0.6;
      const catScore = fuzzyMatch(query, cmd.category || '') * 0.4;
      const score = Math.max(labelScore, descScore, catScore);
      return { cmd, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 12).map(({ cmd }) => cmd);
}

export function conversationToCommand(conv: {
  id: string;
  title: string;
  verdict_recommendation?: string;
  category?: string;
  updated_at: string;
}): Command {
  return {
    id: `conv:${conv.id}`,
    type: 'conversation',
    label: conv.title || 'Untitled conversation',
    verdictDot: conv.verdict_recommendation,
    category: conv.category,
    timestamp: conv.updated_at,
    metadata: { conversationId: conv.id },
  };
}

export function agentToCommand(agent: {
  id: string;
  name: string;
  role?: string;
  description?: string;
  category_id?: string;
  category?: string;
}): Command {
  return {
    id: `agent:${agent.id}`,
    type: 'agent',
    label: agent.name,
    description: agent.role || agent.description || '',
    category: agent.category_id || agent.category || 'life',
    metadata: { agentId: agent.id },
  };
}
