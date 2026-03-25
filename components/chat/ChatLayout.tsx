'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/design/cn';
import { layout } from '@/lib/design/tokens';
import ConversationSidebar from './ConversationSidebar';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSidebarExpanded(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-dvh bg-surface-0 overflow-hidden">
      {/* Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            'h-full shrink-0 bg-surface-1 border-r border-border-subtle',
            'transition-[width] duration-normal ease-out overflow-hidden',
          )}
          style={{ width: sidebarExpanded ? layout.sidebarExpanded : layout.sidebarCollapsed }}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <ConversationSidebar expanded={sidebarExpanded} />
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile header */}
        {isMobile && (
          <header className="h-12 flex items-center px-4 border-b border-border-subtle bg-surface-1 shrink-0">
            <button
              onClick={() => setSidebarExpanded(true)}
              className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 5h12M3 9h12M3 13h12" />
              </svg>
            </button>
            <div className="flex-1 flex justify-center">
              <span className="text-sm font-light tracking-widest text-txt-tertiary lowercase">octux</span>
            </div>
            <div className="w-7" /> {/* balance */}
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
            <ConversationSidebar expanded={true} onNavigate={() => setSidebarExpanded(false)} />
          </aside>
        </>
      )}
    </div>
  );
}
