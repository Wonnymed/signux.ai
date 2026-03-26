'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/design/cn';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useAppStore } from '@/lib/store/app';
import Sidebar from '@/components/sidebar/Sidebar';
import { Menu } from 'lucide-react';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded);
  const setSidebarExpanded = useAppStore((s) => s.setSidebarExpanded);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Central keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: () => setSidebarExpanded(!sidebarExpanded),
    onFocusInput: () => document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus(),
    onExpandVerdict: () => window.dispatchEvent(new CustomEvent('octux:toggle-verdict-expand')),
    onStartDeepSim: () => window.dispatchEvent(new CustomEvent('octux:auto-simulate', { detail: { tier: 'deep' } })),
    onStartKrakenSim: () => window.dispatchEvent(new CustomEvent('octux:auto-simulate', { detail: { tier: 'kraken' } })),
  });

  return (
    <div className="flex h-dvh bg-surface-0">
      {/* Sidebar — always visible on desktop */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-y-auto overflow-x-hidden">
        {/* Mobile header */}
        {isMobile && (
          <header className="h-12 flex items-center px-4 border-b border-border-subtle bg-surface-1 shrink-0 sticky top-0 z-30">
            <button
              onClick={() => setSidebarExpanded(true)}
              className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
            >
              <Menu size={18} />
            </button>
            <div className="flex-1 flex justify-center">
              <span className="text-sm font-light tracking-widest text-txt-tertiary lowercase">octux</span>
            </div>
            <div className="w-7" />
          </header>
        )}

        {children}
      </main>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarExpanded && (
        <>
          <div
            className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setSidebarExpanded(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-surface-1 border-r border-border-subtle z-50 animate-slide-in-right">
            <Sidebar />
          </aside>
        </>
      )}
    </div>
  );
}
