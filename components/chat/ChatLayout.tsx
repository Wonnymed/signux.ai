'use client';

import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/design/cn';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useAppStore } from '@/lib/store/app';
import { useAuth } from '@/components/auth/AuthProvider';
import Sidebar from '@/components/sidebar/Sidebar';
import DashboardShell from '@/components/dashboard/DashboardShell';
import LandingNav from '@/components/landing/LandingNav';
import GuestMobileDrawer from '@/components/landing/GuestMobileDrawer';
import { Menu } from 'lucide-react';

/** Matches Tailwind `md:` — sidebar is overlay below this width */
const MD_BREAKPOINT = 768;

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const pathname = usePathname();
  const [viewport, setViewport] = useState<'mobile' | 'desktop' | null>(null);

  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded);
  const setSidebarExpanded = useAppStore((s) => s.setSidebarExpanded);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const { isAuthenticated, isLoading } = useAuth();

  const isMobile = viewport === 'mobile';

  // Before paint: detect viewport and force mobile drawer closed on load (store defaults to expanded).
  /* eslint-disable react-hooks/set-state-in-effect -- intentional sync with window + Zustand before first paint */
  useLayoutEffect(() => {
    const mobile = window.innerWidth < MD_BREAKPOINT;
    setViewport(mobile ? 'mobile' : 'desktop');
    if (mobile) {
      setSidebarExpanded(false);
    }
  }, [setSidebarExpanded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Resize: sync viewport + collapse overlay when entering mobile
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MD_BREAKPOINT;
      setViewport(mobile ? 'mobile' : 'desktop');
      if (mobile) {
        setSidebarExpanded(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setSidebarExpanded]);

  // Mobile: close drawer after navigation (new chat, conversation, tools…)
  useEffect(() => {
    if (viewport !== 'mobile') return;
    setSidebarExpanded(false);
  }, [pathname, viewport, setSidebarExpanded]);

  // Mobile drawer: Escape to close + lock body scroll
  useEffect(() => {
    if (!isMobile || !sidebarExpanded) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSidebarExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobile, sidebarExpanded, setSidebarExpanded]);

  const openMobileMenu = useCallback(() => setSidebarExpanded(true), [setSidebarExpanded]);
  const closeMobileMenu = useCallback(() => setSidebarExpanded(false), [setSidebarExpanded]);

  const useDashboardShell = isAuthenticated && !isLoading;

  const toggleDashboardSidebar = useCallback(() => {
    window.dispatchEvent(new CustomEvent('octux:dashboard-sidebar-toggle'));
  }, []);

  const handleToggleSidebar = useCallback(() => {
    if (useDashboardShell) {
      toggleDashboardSidebar();
    } else {
      toggleSidebar();
    }
  }, [useDashboardShell, toggleDashboardSidebar, toggleSidebar]);

  useKeyboardShortcuts({
    onToggleSidebar: handleToggleSidebar,
    onFocusInput: () => document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus(),
    onExpandVerdict: () => window.dispatchEvent(new CustomEvent('octux:toggle-verdict-expand')),
    onStartSpecialistSim: () =>
      window.dispatchEvent(new CustomEvent('octux:auto-simulate', { detail: { simMode: 'specialist' } })),
    onStartCompareSim: () =>
      window.dispatchEvent(new CustomEvent('octux:auto-simulate', { detail: { simMode: 'compare' } })),
  });

  const showAuthButtons = !isLoading && !isAuthenticated;

  /** Logged-in users use DashboardShell; legacy Sidebar only for authenticated non-dashboard routes (none today). Guests never see the app sidebar (FIX G). */
  const showDesktopSidebar =
    viewport === 'desktop' && !useDashboardShell && isAuthenticated && !isLoading;
  const showMobileDrawer =
    viewport === 'mobile' && sidebarExpanded && !useDashboardShell && isAuthenticated && !isLoading;
  const showGuestMobileDrawer =
    viewport === 'mobile' && sidebarExpanded && !useDashboardShell && !isAuthenticated && !isLoading;
  const showLandingNav =
    viewport === 'desktop' && !useDashboardShell && !isAuthenticated && !isLoading;
  /** Top strip only on small viewports; desktop uses sidebar + profile for auth (no header line). */
  const showMainHeader = viewport !== 'desktop';

  if (useDashboardShell) {
    return (
      <div className="flex min-h-0 h-[100dvh] overflow-x-hidden">
        <a href="#main-content" className="octx-skip-link">
          Skip to content
        </a>
        <DashboardShell>
          <main
            id="main-content"
            tabIndex={-1}
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto outline-none focus:outline-none supports-[padding:max(0px)]:pb-[max(0px,env(safe-area-inset-bottom))]"
          >
            {children}
          </main>
        </DashboardShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 h-[100dvh] overflow-x-hidden bg-surface-0">
      <a href="#main-content" className="octx-skip-link">
        Skip to content
      </a>
      {/* Desktop sidebar only — never mount on mobile (avoids flash + layout shift) */}
      {showDesktopSidebar && <Sidebar />}

      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto outline-none focus:outline-none supports-[padding:max(0px)]:pb-[max(0px,env(safe-area-inset-bottom))]"
      >
        {showLandingNav && <LandingNav />}
        {showMainHeader && (
          <header
            className={cn(
              'sticky top-0 z-30 flex h-12 shrink-0 items-center bg-surface-0/95 px-3 backdrop-blur-sm supports-[padding:max(0px)]:pt-[max(0px,env(safe-area-inset-top))] sm:px-4',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={openMobileMenu}
                className="rounded-md p-2 text-icon-secondary transition-colors duration-normal ease-out hover:bg-surface-2 hover:text-icon-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
                aria-label="Open menu"
                aria-expanded={sidebarExpanded}
              >
                <Menu size={20} strokeWidth={1.75} />
              </button>
              <span className="truncate text-sm font-medium tracking-tight text-txt-primary">octux</span>
            </div>

            {showAuthButtons && (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }))}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border-default bg-surface-0 px-3 text-sm font-medium text-txt-primary transition-colors duration-normal ease-out hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 sm:px-4"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'signup' } }))}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border-default bg-surface-0 px-3 text-sm font-medium text-txt-primary transition-colors duration-normal ease-out hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 sm:px-4"
                >
                  <span className="sm:hidden">Sign up</span>
                  <span className="hidden sm:inline">Sign up for free</span>
                </button>
              </div>
            )}
          </header>
        )}

        {children}
      </main>

      {/* Mobile: full-screen overlay + drawer from the left */}
      {showMobileDrawer && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[100] bg-surface-overlay/70 backdrop-blur-sm animate-fade-in"
            onClick={closeMobileMenu}
          />
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-[110] flex w-[min(288px,92vw)] max-w-full flex-col',
              'border-r border-border-subtle bg-surface-1 shadow-xl',
              'animate-slide-in-left pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
            )}
          >
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              <Sidebar />
            </div>
          </aside>
        </>
      )}

      {showGuestMobileDrawer && <GuestMobileDrawer onClose={closeMobileMenu} />}
    </div>
  );
}
