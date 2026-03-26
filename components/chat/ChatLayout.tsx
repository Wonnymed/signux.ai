'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/design/cn';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useAppStore } from '@/lib/store/app';
import { useAuth } from '@/components/auth/AuthProvider';
import Sidebar from '@/components/sidebar/Sidebar';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded);
  const setSidebarExpanded = useAppStore((s) => s.setSidebarExpanded);
  const { isAuthenticated, isLoading } = useAuth();

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

  const showAuthButtons = !isLoading && !isAuthenticated;

  return (
    <div className="flex h-dvh bg-surface-0">
      {/* Sidebar — always visible on desktop */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-x-hidden overflow-y-auto">
        {/* Top header bar */}
        <header className="h-12 flex items-center px-4 shrink-0 sticky top-0 z-30 bg-surface-0">
          {/* Left: sidebar toggle */}
          {!isMobile && (
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
            >
              {sidebarExpanded ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setSidebarExpanded(true)}
              className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
            >
              <Menu size={18} />
            </button>
          )}

          <div className="flex-1" />

          {/* Right: auth buttons */}
          {showAuthButtons && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }))}
                className="px-4 py-1.5 text-sm text-txt-secondary hover:text-txt-primary border border-border-default rounded-lg transition-colors duration-normal"
              >
                Log in
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'signup' } }))}
                className="px-4 py-1.5 text-sm text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors duration-normal"
              >
                Sign up for free
              </button>
            </div>
          )}
        </header>

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
