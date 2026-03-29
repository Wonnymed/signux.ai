'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Globe, Gem, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBillingStore } from '@/lib/store/billing';
import { useThemeStore, type ThemeMode } from '@/lib/store/theme';
import { TRANSITIONS } from '@/lib/design/transitions';
import type { TierType } from '@/lib/billing/tiers';

function initialsFromUser(user: { email?: string | null; user_metadata?: { full_name?: string } } | null) {
  const name = user?.user_metadata?.full_name || user?.email || '?';
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function planLabel(t: TierType) {
  if (t === 'free') return 'Free';
  if (t === 'pro') return 'Pro';
  return 'Max';
}

const MENU_SURFACE = 'rgba(15,15,20,0.97)';
const MENU_BORDER = 'rgba(255,255,255,0.1)';
const DIVIDER = 'rgba(255,255,255,0.06)';

export default function UserProfilePopover({ variant = 'full' }: { variant?: 'full' | 'rail' }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const tier = useBillingStore((s) => s.tier);
  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const mode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const onPickTheme = useCallback(
    (m: ThemeMode) => {
      setThemeMode(m);
    },
    [setThemeMode],
  );

  const handleLogout = useCallback(async () => {
    setOpen(false);
    await signOut();
    router.push('/');
  }, [signOut, router]);

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account';
  const email = user?.email || '';

  const isRail = variant === 'rail';

  const railTrigger = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[12px] font-medium leading-none transition-colors hover:opacity-95"
      style={{
        backgroundColor: 'rgba(232, 89, 60, 0.15)',
        color: '#e8593c',
      }}
      aria-expanded={open}
      aria-label={name}
    >
      {initialsFromUser(user)}
    </button>
  );

  return (
    <div
      ref={rootRef}
      className={
        isRail
          ? 'relative flex shrink-0 justify-center py-0.5'
          : 'relative shrink-0 border-t'
      }
      style={isRail ? undefined : { borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {isRail ? (
        <Tooltip>
          <TooltipTrigger asChild>{railTrigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="border border-white/[0.08] bg-[#1a1a1f] px-2 py-1 text-[12px] text-white/80 shadow-md">
            {name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={name}
          className="flex w-full cursor-pointer items-center gap-2.5 px-[14px] py-3 text-left transition-colors hover:bg-white/[0.03]"
          aria-expanded={open}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-medium"
            style={{
              backgroundColor: 'rgba(232,89,60,0.15)',
              color: '#e8593c',
            }}
          >
            {initialsFromUser(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white/80">{name}</p>
            {email ? <p className="truncate text-[11px] text-white/30">{email}</p> : null}
            <p className="mt-0.5 text-[11px] text-white/25">
              {planLabel(tier)} · {tokensRemaining} tokens left
            </p>
          </div>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={isRail ? { opacity: 0, x: -8 } : { opacity: 0, y: 8 }}
            animate={isRail ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
            exit={isRail ? { opacity: 0, x: -4 } : { opacity: 0, y: 4 }}
            transition={TRANSITIONS.component}
            className={
              isRail
                ? 'absolute bottom-0 left-[calc(100%+8px)] z-[90] w-[min(288px,calc(100vw-80px))] overflow-hidden rounded-[10px] p-1 shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
                : 'absolute bottom-full left-2 right-2 z-[80] mb-2 overflow-hidden rounded-[10px] p-1 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]'
            }
            style={{
              backgroundColor: MENU_SURFACE,
              border: `1px solid ${MENU_BORDER}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white/90"
            >
              <Settings size={16} className="shrink-0 opacity-80" strokeWidth={1.75} />
              Settings
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white/90"
            >
              <Globe size={16} className="shrink-0 opacity-80" strokeWidth={1.75} />
              Language <span className="ml-auto text-[11px] text-white/35">English</span>
            </Link>

            <div className="my-1 h-px" style={{ backgroundColor: DIVIDER }} />

            <div style={{ padding: '6px 10px 8px' }}>
              <div
                style={{
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: 'rgba(255,255,255,0.25)',
                  marginBottom: '4px',
                }}
              >
                Theme
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: 2,
                  maxHeight: 36,
                }}
              >
                {(
                  [
                    { id: 'light' as const, label: 'Light', Icon: Sun },
                    { id: 'system' as const, label: 'System', Icon: Monitor },
                    { id: 'dark' as const, label: 'Dark', Icon: Moon },
                  ] as const
                ).map(({ id: t, label, Icon }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onPickTheme(t)}
                    title={label}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '4px 2px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 500,
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                      background: mode === t ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: mode === t ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <Icon size={14} strokeWidth={2} />
                    <span className="hidden min-[380px]:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="my-1 h-px" style={{ backgroundColor: DIVIDER }} />

            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white/90"
            >
              <Gem size={16} className="shrink-0 opacity-80" strokeWidth={1.75} />
              View all plans
            </Link>

            <div className="my-1 h-px" style={{ backgroundColor: DIVIDER }} />

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-white/45 transition-colors hover:bg-red-500/10 hover:text-[#f87171]"
            >
              <LogOut size={16} className="shrink-0 opacity-80" strokeWidth={1.75} />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
