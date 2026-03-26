import type { LucideIcon } from 'lucide-react';
import { BookOpen, GitCompare, Shield, FileText } from 'lucide-react';

export interface OctuxTool {
  slug: string;
  name: string;
  href: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const OCTUX_TOOLS: OctuxTool[] = [
  {
    slug: 'journal',
    name: 'Decision Journal',
    href: '/tools/journal',
    icon: BookOpen,
    color: '#7C3AED',
    description:
      'Track every decision you make. See patterns over time. Learn from outcomes.',
  },
  {
    slug: 'compare',
    name: 'Compare Scenarios',
    href: '/tools/compare',
    icon: GitCompare,
    color: '#10b981',
    description:
      'Side-by-side comparison of two or more options with structured pros and cons.',
  },
  {
    slug: 'risk-matrix',
    name: 'Risk Matrix',
    href: '/tools/risk-matrix',
    icon: Shield,
    color: '#f59e0b',
    description:
      'Map risks by probability and impact. Visualize what matters most.',
  },
  {
    slug: 'templates',
    name: 'Decision Templates',
    href: '/tools/templates',
    icon: FileText,
    color: '#6366f1',
    description:
      'Pre-built frameworks for common decisions. Fill in the blanks.',
  },
];
