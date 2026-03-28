'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, ArrowLeftRight, AlertTriangle, Skull } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { openAuthModal } from '@/lib/auth/openAuthModal';
import type { DashboardMode } from '@/lib/store/dashboard-ui';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';

const MODES: {
  name: string;
  modeId: DashboardMode;
  Icon: typeof Zap;
  line1: string;
  line2: string;
  iconWrap: string;
}[] = [
  {
    name: 'Simulate',
    modeId: 'simulate',
    Icon: Zap,
    line1: '10 experts analyze',
    line2: 'your decision',
    iconWrap: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  },
  {
    name: 'Compare',
    modeId: 'compare',
    Icon: ArrowLeftRight,
    line1: 'A vs B — which',
    line2: 'path wins?',
    iconWrap: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
  {
    name: 'Stress test',
    modeId: 'stress',
    Icon: AlertTriangle,
    line1: 'Find every way',
    line2: 'this plan can fail',
    iconWrap: 'bg-red-500/15 text-red-600 dark:text-red-400',
  },
  {
    name: 'Pre-mortem',
    modeId: 'premortem',
    Icon: Skull,
    line1: 'It failed in 1 year.',
    line2: 'Why?',
    iconWrap: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
] as const;

export default function SimulationModes({ forLoggedInUser = false }: { forLoggedInUser?: boolean }) {
  const router = useRouter();
  const setActiveMode = useDashboardUiStore((s) => s.setActiveMode);

  const goToDashboardWithMode = (modeId: DashboardMode) => {
    setActiveMode(modeId);
    router.push('/');
  };

  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-landing">
        <h2 className="text-center text-2xl font-medium tracking-tight text-txt-primary sm:text-3xl">
          Four ways to stress-test any decision
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-txt-tertiary">
          Each mode attacks your question from a different angle.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-center text-[13px] leading-snug text-txt-tertiary/80">
          No other tool offers even one of these.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => {
            const Icon = m.Icon;
            if (forLoggedInUser) {
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => goToDashboardWithMode(m.modeId)}
                  className={cn(
                    'flex flex-col rounded-2xl border border-border-subtle bg-surface-1 p-5 text-left shadow-[0_4px_24px_rgba(15,23,42,0.04)]',
                    'transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                  )}
                >
                  <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', m.iconWrap)}>
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold text-txt-primary">{m.name}</h3>
                  <p className="mt-2 text-sm leading-snug text-txt-secondary">
                    {m.line1}
                    <br />
                    {m.line2}
                  </p>
                  <span className="mt-4 text-xs font-medium text-accent">Start a simulation →</span>
                </button>
              );
            }
            return (
              <button
                key={m.name}
                type="button"
                onClick={() => openAuthModal({ tab: 'signup' })}
                className={cn(
                  'flex flex-col rounded-2xl border border-border-subtle bg-surface-1 p-5 text-left shadow-[0_4px_24px_rgba(15,23,42,0.04)]',
                  'transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                )}
              >
                <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', m.iconWrap)}>
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-txt-primary">{m.name}</h3>
                <p className="mt-2 text-sm leading-snug text-txt-secondary">
                  {m.line1}
                  <br />
                  {m.line2}
                </p>
              </button>
            );
          })}
        </div>

        {forLoggedInUser ? (
          <p className="mx-auto mt-8 max-w-lg text-center text-sm text-txt-tertiary">
            Prefer to choose later?{' '}
            <Link href="/" className="font-medium text-accent underline-offset-2 hover:underline">
              Open the dashboard
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
