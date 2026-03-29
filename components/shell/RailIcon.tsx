'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

const TERRA = '#e8593c';

const TOOLTIP_DARK =
  'border border-white/[0.08] bg-[#1a1a1f] px-2.5 py-1.5 text-[12px] text-white/80 shadow-lg';

export type RailIconTone = 'dark' | 'app';

export interface RailIconProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  /** Dashboard rail (fixed dark) vs app shell sidebar */
  tone?: RailIconTone;
  tooltipClassName?: string;
  /** Default 22 (nav); use 20 for compact actions (e.g. upgrade gem). */
  iconSize?: number;
}

/**
 * Centered 36×36 rail target, 22px icon, active terracotta bar hugging the icon column.
 */
export default function RailIcon({
  icon: Icon,
  label,
  active = false,
  onClick,
  href,
  tone = 'dark',
  tooltipClassName = TOOLTIP_DARK,
  iconSize = 22,
}: RailIconProps) {
  const inactive =
    tone === 'dark'
      ? 'text-white/45 hover:bg-white/[0.04] hover:text-white/60'
      : 'text-txt-primary/40 hover:bg-surface-2 hover:text-txt-primary/80';
  const activeCls =
    tone === 'dark'
      ? 'bg-white/[0.06] text-white/90'
      : 'bg-surface-2 text-txt-primary';

  const className = cn(
    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-[background,color] duration-150',
    active ? activeCls : inactive,
  );

  const body = (
    <>
      {active ? (
        <span
          className="pointer-events-none absolute left-[5px] top-1/2 z-0 h-5 w-[3px] -translate-y-1/2 rounded-r-[2px]"
          style={{ backgroundColor: TERRA }}
          aria-hidden
        />
      ) : null}
      <Icon size={iconSize} strokeWidth={1.8} className="relative z-[1] shrink-0" />
    </>
  );

  const trigger =
    href !== undefined ? (
      <Link href={href} className={className} aria-label={label}>
        {body}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={className} aria-label={label}>
        {body}
      </button>
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className={tooltipClassName}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
