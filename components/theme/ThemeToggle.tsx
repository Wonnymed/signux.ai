'use client';

import { motion } from 'framer-motion';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useThemeStore, type ThemeMode } from '@/lib/store/theme';

export default function ThemeToggle({ className }: { className?: string }) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const options = [
    { key: 'light' as const, icon: Sun, label: 'Light' },
    { key: 'system' as const, icon: Monitor, label: 'System' },
    { key: 'dark' as const, icon: Moon, label: 'Dark' },
  ];

  return (
    <div className={cn('flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5', className)}>
      {options.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setMode(key)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all',
            mode === key
              ? 'bg-surface-raised text-txt-primary shadow-sm'
              : 'text-txt-tertiary hover:text-txt-secondary',
          )}
          title={label}
        >
          <Icon size={13} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleCompact() {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useThemeStore((s) => s.resolved);
  const setMode = useThemeStore((s) => s.setMode);

  const cycle = () => {
    const next: ThemeMode =
      mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
  };

  const Icon = resolved === 'dark' ? Moon : Sun;
  const modeShort = mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark';

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-txt-secondary transition-colors hover:bg-surface-2"
    >
      <motion.span
        className="inline-flex shrink-0"
        animate={{ rotate: resolved === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Icon size={15} />
      </motion.span>
      <span className="flex-1 text-[13px]">Appearance</span>
      <span className="text-[11px] text-txt-tertiary tabular-nums">{modeShort}</span>
    </button>
  );
}
