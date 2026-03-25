export type MilestoneId =
  | 'first_message'
  | 'first_simulation'
  | 'first_verdict'
  | 'first_agent_chat'
  | 'first_share'
  | 'third_conversation'
  | 'fifth_simulation'
  | 'first_refine'
  | 'free_limit_reached';

export type TipId =
  | 'tip_simulate'
  | 'tip_agent_perspectives'
  | 'tip_citations'
  | 'tip_expand_verdict'
  | 'tip_keyboard_shortcuts'
  | 'tip_decision_style'
  | 'tip_agent_chat'
  | 'tip_share';

export interface Milestone {
  id: MilestoneId;
  title: string;
  description: string;
  emoji: string;
  triggeredBy: string;
  celebration: 'toast' | 'subtle' | 'none';
}

export interface Tip {
  id: TipId;
  text: string;
  triggeredAfter: MilestoneId;
  position: 'bottom-center' | 'top-right' | 'inline';
  dismissible: boolean;
  showOnce: boolean;
  delayMs: number;
}

// ═══ MILESTONES ═══

export const MILESTONES: Record<MilestoneId, Milestone> = {
  first_message: {
    id: 'first_message',
    title: 'First question asked',
    description: "You're on your way",
    emoji: '🐙',
    triggeredBy: 'octux:message-sent',
    celebration: 'none',
  },
  first_simulation: {
    id: 'first_simulation',
    title: 'First simulation launched',
    description: '10 specialists are debating your decision',
    emoji: '⚡',
    triggeredBy: 'octux:simulation-started',
    celebration: 'subtle',
  },
  first_verdict: {
    id: 'first_verdict',
    title: 'First verdict received',
    description: 'This is your first decision on Octux',
    emoji: '🎯',
    triggeredBy: 'octux:verdict-received',
    celebration: 'toast',
  },
  first_agent_chat: {
    id: 'first_agent_chat',
    title: 'First agent conversation',
    description: 'You went deeper with a specialist',
    emoji: '🗣️',
    triggeredBy: 'octux:agent-chat',
    celebration: 'subtle',
  },
  first_share: {
    id: 'first_share',
    title: 'First share',
    description: 'Your analysis is out in the world',
    emoji: '🔗',
    triggeredBy: 'octux:share',
    celebration: 'toast',
  },
  third_conversation: {
    id: 'third_conversation',
    title: 'Decision streak',
    description: 'Octux is learning your decision style',
    emoji: '🧠',
    triggeredBy: 'octux:conversation-count-3',
    celebration: 'toast',
  },
  fifth_simulation: {
    id: 'fifth_simulation',
    title: 'Power analyst',
    description: "You've run 5 simulations",
    emoji: '🏆',
    triggeredBy: 'octux:simulation-count-5',
    celebration: 'toast',
  },
  first_refine: {
    id: 'first_refine',
    title: 'First refinement',
    description: "You asked 'what if' — that's how better decisions happen",
    emoji: '🔀',
    triggeredBy: 'octux:refine-sent',
    celebration: 'subtle',
  },
  free_limit_reached: {
    id: 'free_limit_reached',
    title: 'Free simulations used',
    description: "You've used all 3 free simulations this month",
    emoji: '📊',
    triggeredBy: 'octux:free-limit-reached',
    celebration: 'none',
  },
};

// ═══ CONTEXTUAL TIPS ═══

export const TIPS: Record<TipId, Tip> = {
  tip_simulate: {
    id: 'tip_simulate',
    text: "💡 Type 'simulate' or click ⚡ for a Deep analysis with 10 specialists",
    triggeredAfter: 'first_message',
    position: 'bottom-center',
    dismissible: true,
    showOnce: true,
    delayMs: 2000,
  },
  tip_agent_perspectives: {
    id: 'tip_agent_perspectives',
    text: '💡 Each specialist has a different perspective — expand their cards to see why',
    triggeredAfter: 'first_simulation',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 5000,
  },
  tip_citations: {
    id: 'tip_citations',
    text: '💡 Hover the numbered pills to see which agent made each claim',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 3000,
  },
  tip_expand_verdict: {
    id: 'tip_expand_verdict',
    text: '💡 Click "Expand" to see the full agent scoreboard and risk matrix',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 8000,
  },
  tip_keyboard_shortcuts: {
    id: 'tip_keyboard_shortcuts',
    text: '💡 Press ? for keyboard shortcuts, ⌘K for command palette',
    triggeredAfter: 'third_conversation',
    position: 'bottom-center',
    dismissible: true,
    showOnce: true,
    delayMs: 1000,
  },
  tip_decision_style: {
    id: 'tip_decision_style',
    text: '🧠 Octux is learning your decision style → See your decision personality',
    triggeredAfter: 'third_conversation',
    position: 'top-right',
    dismissible: true,
    showOnce: true,
    delayMs: 5000,
  },
  tip_agent_chat: {
    id: 'tip_agent_chat',
    text: '💡 Click "Chat" on any agent to dig deeper into their analysis',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 15000,
  },
  tip_share: {
    id: 'tip_share',
    text: '💡 Click "Share" to get a professional boardroom report link',
    triggeredAfter: 'first_verdict',
    position: 'inline',
    dismissible: true,
    showOnce: true,
    delayMs: 20000,
  },
};

/**
 * Get tips that should trigger after a milestone
 */
export function getTipsForMilestone(milestoneId: MilestoneId): Tip[] {
  return Object.values(TIPS).filter(t => t.triggeredAfter === milestoneId);
}
