'use client';

import { useThemeStore, type ThemeMode } from '@/lib/store/theme';
import { SettingSection } from '../_components';
import { cn } from '@/lib/design/cn';

const OPTIONS: { mode: ThemeMode; icon: string; title: string; desc: string }[] = [
  { mode: 'light', icon: '☀️', title: 'Light', desc: 'Clean white interface' },
  { mode: 'system', icon: '🖥', title: 'System', desc: 'Follows your OS setting' },
  { mode: 'dark', icon: '🌙', title: 'Dark', desc: 'Easy on the eyes' },
];

export default function SettingsAppearancePage() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      <SettingSection title="Theme" description="Choose how Octux looks to you.">
        <div className="grid gap-3 sm:grid-cols-3">
          {OPTIONS.map(({ mode: m, icon, title, desc }) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex flex-col items-start rounded-xl border p-4 text-left transition-colors',
                  active
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border-subtle bg-surface-1 hover:border-border-default hover:bg-surface-2/80',
                )}
              >
                <span
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-xl"
                  aria-hidden
                >
                  {icon}
                </span>
                <span className="text-sm font-medium text-txt-primary">{title}</span>
                <span className="mt-1 text-xs text-txt-tertiary">{desc}</span>
              </button>
            );
          })}
        </div>
      </SettingSection>
    </div>
  );
}
