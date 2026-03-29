import type { LucideIcon } from 'lucide-react';
import { BookOpen, GitCompare, Shield, FileText } from 'lucide-react';

export interface SukgoTool {
  slug: string;
  name: string;
  href: string;
  icon: LucideIcon;
  /** Legacy tint — UI uses neutral tokens; keep for non-sidebar consumers */
  color: string;
  description: string;
}

const NEUTRAL_TOOL = '#8a8578';

export const SUKGO_TOOLS: SukgoTool[] = [
  {
    slug: 'journal',
    name: 'Decision Journal',
    href: '/tools/journal',
    icon: BookOpen,
    color: NEUTRAL_TOOL,
    description:
      'Track every decision you make. See patterns over time. Learn from outcomes.',
  },
  {
    slug: 'compare',
    name: 'Compare Scenarios',
    href: '/tools/compare',
    icon: GitCompare,
    color: NEUTRAL_TOOL,
    description:
      'Side-by-side comparison of two or more options with structured pros and cons.',
  },
  {
    slug: 'risk-matrix',
    name: 'Risk Matrix',
    href: '/tools/risk-matrix',
    icon: Shield,
    color: NEUTRAL_TOOL,
    description:
      'Map risks by probability and impact. Visualize what matters most.',
  },
  {
    slug: 'templates',
    name: 'Decision Templates',
    href: '/tools/templates',
    icon: FileText,
    color: NEUTRAL_TOOL,
    description:
      'Pre-built frameworks for common decisions. Fill in the blanks.',
  },
];

/** Legacy alias — tool pages still import `OCTUX_TOOLS`. */
export const OCTUX_TOOLS = SUKGO_TOOLS;
