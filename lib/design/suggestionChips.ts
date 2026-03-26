import {
  Briefcase,
  Globe,
  Heart,
  Store,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface SuggestionChipConfig {
  text: string;
  color: string;
  Icon: LucideIcon;
}

/** Shared hero + chat suggestion chips — category color + icon */
export const SUGGESTION_CHIP_CONFIG: SuggestionChipConfig[] = [
  { text: 'Should I invest $10K in NVIDIA?', color: '#6366f1', Icon: TrendingUp },
  { text: 'Time to break up or work on it?', color: '#ec4899', Icon: Heart },
  { text: 'Quit my 9-5 for a startup?', color: '#f59e0b', Icon: Briefcase },
  { text: 'Open a restaurant in Gangnam?', color: '#10b981', Icon: Store },
  { text: 'Move abroad or stay close to family?', color: '#06b6d4', Icon: Globe },
];
