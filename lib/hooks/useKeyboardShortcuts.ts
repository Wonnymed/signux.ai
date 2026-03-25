'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/hooks/useTheme';
import { SHORTCUTS } from '@/lib/shortcuts/registry';

interface ShortcutHandlers {
  onToggleSidebar?: () => void;
  onFocusInput?: () => void;
  onCopyVerdict?: () => void;
  onExpandVerdict?: () => void;
  onStartDeepSim?: () => void;
  onStartKrakenSim?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const sequenceRef = useRef<string[]>([]);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const isInputFocused = useCallback((): boolean => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if ((el as HTMLElement).contentEditable === 'true') return true;
    return false;
  }, []);

  const executeAction = useCallback((action: string) => {
    switch (action) {
      // Global
      case 'command-palette':
        // Handled by CommandProvider directly (Cmd+K)
        break;
      case 'new-conversation':
        router.push('/');
        break;
      case 'close-modal':
        // Handled by individual modals
        break;
      case 'show-shortcuts':
        window.dispatchEvent(new CustomEvent('octux:show-shortcuts'));
        break;

      // Navigation
      case 'navigate-home':
        router.push('/');
        break;
      case 'navigate-settings':
        window.dispatchEvent(new CustomEvent('octux:open-settings'));
        break;
      case 'navigate-profile':
        window.dispatchEvent(new CustomEvent('octux:open-profile'));
        break;
      case 'filter-investment':
        window.dispatchEvent(new CustomEvent('octux:category-filter', { detail: { category: 'investment' } }));
        break;
      case 'filter-relationships':
        window.dispatchEvent(new CustomEvent('octux:category-filter', { detail: { category: 'relationships' } }));
        break;
      case 'filter-career':
        window.dispatchEvent(new CustomEvent('octux:category-filter', { detail: { category: 'career' } }));
        break;
      case 'filter-business':
        window.dispatchEvent(new CustomEvent('octux:category-filter', { detail: { category: 'business' } }));
        break;
      case 'filter-life':
        window.dispatchEvent(new CustomEvent('octux:category-filter', { detail: { category: 'life' } }));
        break;

      // Conversation
      case 'focus-input':
        handlersRef.current.onFocusInput?.();
        break;
      case 'copy-verdict':
        handlersRef.current.onCopyVerdict?.();
        break;
      case 'expand-verdict':
        handlersRef.current.onExpandVerdict?.();
        break;

      // Simulation
      case 'start-deep-sim':
        handlersRef.current.onStartDeepSim?.();
        break;
      case 'start-kraken-sim':
        handlersRef.current.onStartKrakenSim?.();
        break;

      // UI
      case 'toggle-sidebar':
        handlersRef.current.onToggleSidebar?.();
        break;
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'open-settings':
        window.dispatchEvent(new CustomEvent('octux:open-settings'));
        break;
      case 'search-conversations':
        // Handled by SidebarSearch directly (Cmd+F)
        break;
    }

    // Visual feedback
    const shortcut = SHORTCUTS.find(s => s.action === action);
    if (shortcut && action !== 'command-palette' && action !== 'close-modal') {
      window.dispatchEvent(new CustomEvent('octux:shortcut-executed', {
        detail: { label: shortcut.label, keys: shortcut.keys },
      }));
    }
  }, [router, toggleTheme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = isInputFocused();

      // Build key string
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('Meta');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (!['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) parts.push(e.key);
      const keyCombo = parts.join('+');

      // Check for modifier-based shortcuts (Cmd+K, Cmd+N, etc.)
      for (const shortcut of SHORTCUTS) {
        if (shortcut.keySequence.length === 1) {
          const expected = shortcut.keySequence[0];

          // Modifier shortcut (contains +)
          if (expected.includes('+')) {
            if (keyCombo === expected) {
              if (!shortcut.allowInInput && inInput) continue;
              // Let Cmd+K be handled by CommandProvider
              if (shortcut.action === 'command-palette') continue;
              // Let Cmd+F be handled by SidebarSearch
              if (shortcut.action === 'search-conversations') continue;
              e.preventDefault();
              executeAction(shortcut.action);
              return;
            }
          }
          // Single key shortcut (no modifier)
          else if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            if (e.key === expected) {
              if (!shortcut.allowInInput && inInput) continue;

              // ? key (needs Shift on most keyboards but comes through as ?)
              if (expected === '?') {
                e.preventDefault();
                executeAction(shortcut.action);
                return;
              }

              e.preventDefault();
              // Could be start of a G-sequence
              const hasSequence = SHORTCUTS.some(
                s => s.keySequence.length === 2 && s.keySequence[0] === e.key
              );
              if (hasSequence) {
                sequenceRef.current = [e.key];
                clearTimeout(sequenceTimerRef.current);
                sequenceTimerRef.current = setTimeout(() => {
                  // No second key came — execute single-key shortcut
                  if (sequenceRef.current.length === 1) {
                    executeAction(shortcut.action);
                  }
                  sequenceRef.current = [];
                }, 400);
                return;
              }
              // No sequence possible — execute immediately
              executeAction(shortcut.action);
              return;
            }
          }
        }
      }

      // Check for sequence shortcuts (G→H, G→S, etc.)
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !inInput) {
        if (sequenceRef.current.length > 0) {
          clearTimeout(sequenceTimerRef.current);
          sequenceRef.current.push(e.key);

          for (const shortcut of SHORTCUTS) {
            if (shortcut.keySequence.length === 2) {
              if (
                sequenceRef.current[0] === shortcut.keySequence[0] &&
                sequenceRef.current[1] === shortcut.keySequence[1]
              ) {
                e.preventDefault();
                sequenceRef.current = [];
                executeAction(shortcut.action);
                return;
              }
            }
          }

          // No match found for sequence — clear
          sequenceRef.current = [];
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      clearTimeout(sequenceTimerRef.current);
    };
  }, [isInputFocused, executeAction]);
}
