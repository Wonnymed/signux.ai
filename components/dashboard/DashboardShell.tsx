'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/design/cn';
import { DARK_THEME } from '@/lib/dashboard/theme';
import DashboardSidebar from '@/components/dashboard/Sidebar';

const MD = 768;
const STORAGE_KEY = 'octux_sidebar_open';

function readDesktopPreference(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === null) return true;
  return v === 'true';
}

function persistDesktop(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    /* ignore */
  }
}

function OctuxSidebarRevealButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open sidebar"
      className={cn(
        'fixed left-4 top-4 z-[120] flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px]',
        'border border-white/[0.06] bg-[rgba(10,10,15,0.6)] backdrop-blur-[8px]',
        'transition-colors hover:bg-white/[0.04]',
      )}
    >
      <span
        className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#e8593c]"
        style={{ boxShadow: '0 0 8px rgba(232,89,60,0.5)' }}
      />
    </button>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [viewport, setViewport] = useState<'mobile' | 'desktop' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const viewportRef = useRef<'mobile' | 'desktop' | null>(null);
  viewportRef.current = viewport;

  const isMobile = viewport === 'mobile';

  useLayoutEffect(() => {
    const mobile = window.innerWidth < MD;
    const next = mobile ? 'mobile' : 'desktop';
    setViewport(next);
    if (mobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(readDesktopPreference());
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MD;
      setViewport(mobile ? 'mobile' : 'desktop');
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(readDesktopPreference());
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onToggle = () => {
      setSidebarOpen((prev) => {
        const next = !prev;
        if (viewportRef.current !== 'mobile') {
          persistDesktop(next);
        }
        return next;
      });
    };
    window.addEventListener('octux:dashboard-sidebar-toggle', onToggle);
    return () => window.removeEventListener('octux:dashboard-sidebar-toggle', onToggle);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    if (viewportRef.current !== 'mobile') {
      persistDesktop(true);
    }
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    if (viewportRef.current !== 'mobile') {
      persistDesktop(false);
    }
  }, []);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobile, sidebarOpen, closeSidebar]);

  useEffect(() => {
    if (!isMobile) return;
    closeSidebar();
  }, [pathname, isMobile, closeSidebar]);

  if (viewport === null) {
    return (
      <div
        className="flex min-h-0 h-[100dvh] w-full overflow-hidden"
        style={{ backgroundColor: DARK_THEME.bg_primary, color: DARK_THEME.text_primary }}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        className="relative flex min-h-0 h-[100dvh] w-full flex-col overflow-hidden"
        style={{ backgroundColor: DARK_THEME.bg_primary, color: DARK_THEME.text_primary }}
      >
        {!sidebarOpen && <OctuxSidebarRevealButton onClick={openSidebar} />}
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>

        {sidebarOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-[100] bg-black/50"
              onClick={closeSidebar}
            />
            <aside
              className={cn(
                'fixed inset-y-0 left-0 z-[110] flex w-[250px] max-w-full flex-col shadow-xl',
                'animate-slide-in-left pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
              )}
              style={{
                backgroundColor: DARK_THEME.bg_sidebar,
                borderRight: `1px solid ${DARK_THEME.border_default}`,
              }}
            >
              <DashboardSidebar onRequestClose={closeSidebar} />
            </aside>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 h-[100dvh] w-full overflow-hidden"
      style={{ backgroundColor: DARK_THEME.bg_primary, color: DARK_THEME.text_primary }}
    >
      <div
        className={cn(
          'shrink-0 overflow-hidden border-r',
          sidebarOpen
            ? 'w-[250px] min-w-[250px] transition-[width,min-width] duration-[250ms] ease-out'
            : 'w-0 min-w-0 border-transparent transition-[width,min-width] duration-200 ease-in',
        )}
        style={{
          borderColor: sidebarOpen ? DARK_THEME.border_default : 'transparent',
        }}
      >
        <div className="flex h-full w-[250px] flex-col">
          <DashboardSidebar onRequestClose={closeSidebar} />
        </div>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!sidebarOpen && <OctuxSidebarRevealButton onClick={openSidebar} />}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
