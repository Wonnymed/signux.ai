'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import SukgoLogo from '@/components/brand/SukgoLogo';
import { cn } from '@/lib/design/cn';
import { DARK_THEME } from '@/lib/dashboard/theme';
import DashboardSidebar from '@/components/dashboard/Sidebar';

const MD = 768;
const STORAGE_EXPANDED = 'sukgo_sidebar_expanded';
const LEGACY_OPEN = 'sukgo_sidebar_open';

function readDesktopExpanded(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(STORAGE_EXPANDED);
  if (v !== null) return v === 'true';
  const legacy = localStorage.getItem(LEGACY_OPEN);
  if (legacy === 'false') return false;
  return true;
}

function persistDesktopExpanded(expanded: boolean) {
  try {
    localStorage.setItem(STORAGE_EXPANDED, String(expanded));
  } catch {
    /* ignore */
  }
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [viewport, setViewport] = useState<'mobile' | 'desktop' | null>(null);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const viewportRef = useRef<'mobile' | 'desktop' | null>(null);
  viewportRef.current = viewport;

  const isMobile = viewport === 'mobile';

  useLayoutEffect(() => {
    const mobile = window.innerWidth < MD;
    setViewport(mobile ? 'mobile' : 'desktop');
    if (mobile) {
      setMobileDrawerOpen(false);
    } else {
      setDesktopExpanded(readDesktopExpanded());
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MD;
      setViewport(mobile ? 'mobile' : 'desktop');
      if (mobile) {
        setMobileDrawerOpen(false);
      } else {
        setDesktopExpanded(readDesktopExpanded());
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onToggle = () => {
      if (viewportRef.current === 'mobile') {
        setMobileDrawerOpen((o) => !o);
      } else {
        setDesktopExpanded((e) => {
          const next = !e;
          persistDesktopExpanded(next);
          return next;
        });
      }
    };
    window.addEventListener('sukgo:dashboard-sidebar-toggle', onToggle);
    return () => window.removeEventListener('sukgo:dashboard-sidebar-toggle', onToggle);
  }, []);

  const openMobileDrawer = useCallback(() => setMobileDrawerOpen(true), []);
  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  useEffect(() => {
    if (!isMobile || !mobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobile, mobileDrawerOpen, closeMobileDrawer]);

  useEffect(() => {
    if (!isMobile) return;
    closeMobileDrawer();
  }, [pathname, isMobile, closeMobileDrawer]);

  const collapseDesktop = useCallback(() => {
    setDesktopExpanded(false);
    persistDesktopExpanded(false);
  }, []);

  const expandDesktop = useCallback(() => {
    setDesktopExpanded(true);
    persistDesktopExpanded(true);
  }, []);

  if (viewport === null) {
    return (
      <div
        className="flex min-h-0 h-[100dvh] w-full overflow-hidden"
        style={{ backgroundColor: DARK_THEME.bg_primary, color: DARK_THEME.text_primary }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        className="relative flex min-h-0 h-[100dvh] w-full flex-col overflow-hidden"
        style={{ backgroundColor: DARK_THEME.bg_primary, color: DARK_THEME.text_primary }}
      >
        {!mobileDrawerOpen && (
          <header
            className="flex h-12 shrink-0 items-center gap-2 border-b px-3"
            style={{ borderColor: DARK_THEME.border_default, backgroundColor: DARK_THEME.bg_primary }}
          >
            <button
              type="button"
              onClick={openMobileDrawer}
              className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/[0.06]"
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.75} />
            </button>
            <SukgoLogo variant="dark" size="sm" showWordmark className="min-w-0 shrink" />
          </header>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </div>

        {mobileDrawerOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-[100] bg-black/50"
              onClick={closeMobileDrawer}
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
              <DashboardSidebar layout="drawer" onCollapse={closeMobileDrawer} onExpand={() => {}} />
            </aside>
          </>
        )}
      </div>
    );
  }

  const railWidth = desktopExpanded ? 250 : 56;

  return (
    <div
      className="flex min-h-0 h-[100dvh] w-full overflow-hidden"
      style={{ backgroundColor: DARK_THEME.bg_primary, color: DARK_THEME.text_primary }}
    >
      <motion.div
        className="shrink-0 overflow-hidden border-r"
        style={{ borderColor: DARK_THEME.border_default }}
        initial={false}
        animate={{
          width: railWidth,
          minWidth: railWidth,
          maxWidth: railWidth,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <DashboardSidebar
          layout={desktopExpanded ? 'expanded' : 'collapsed'}
          onCollapse={collapseDesktop}
          onExpand={expandDesktop}
        />
      </motion.div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
