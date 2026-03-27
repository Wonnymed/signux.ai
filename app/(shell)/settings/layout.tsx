'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Palette,
  CreditCard,
  Shield,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useAuth } from '@/components/auth/AuthProvider';

const NAV = [
  { href: '/settings/profile', label: 'Profile', Icon: User },
  { href: '/settings/appearance', label: 'Appearance', Icon: Palette },
  { href: '/settings/billing', label: 'Billing', Icon: CreditCard },
  { href: '/settings/data', label: 'Data & Privacy', Icon: Shield },
  { href: '/settings/account', label: 'Account', Icon: KeyRound },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-0">
      <div className="border-b border-border-subtle px-6 py-8 md:px-10">
        <h1 className="text-xl font-medium tracking-tight text-txt-primary">Settings</h1>
        <p className="mt-1 text-sm text-txt-tertiary">Manage your Octux account and preferences.</p>
      </div>

      {!isLoading && !isAuthenticated && (
        <div className="mx-6 mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-txt-secondary md:mx-10">
          Sign in to save profile changes, export data, and manage billing.
          <button
            type="button"
            className="ml-2 font-medium text-accent underline-offset-2 hover:underline"
            onClick={() => window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }))}
          >
            Sign in
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:px-10 md:pb-12">
        {/* Mobile: horizontal tabs */}
        <nav
          className="flex shrink-0 gap-1 overflow-x-auto pb-1 md:hidden"
          aria-label="Settings sections"
        >
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
                  active
                    ? 'bg-surface-2 font-medium text-txt-primary'
                    : 'text-txt-tertiary hover:bg-surface-2/50 hover:text-txt-secondary',
                )}
              >
                <Icon
                  size={14}
                  className={cn('shrink-0', active ? 'text-accent' : 'text-txt-disabled')}
                  strokeWidth={1.75}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop: left rail */}
        <nav
          className="hidden w-44 shrink-0 flex-col gap-0.5 md:flex"
          aria-label="Settings sections"
        >
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-surface-2 font-medium text-txt-primary'
                    : 'text-txt-tertiary hover:bg-surface-2/50 hover:text-txt-secondary',
                )}
              >
                <Icon size={16} className={cn('shrink-0', active ? 'text-accent' : 'text-txt-disabled')} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
