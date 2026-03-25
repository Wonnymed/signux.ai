'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/hooks/useTheme';
import {
  type Command, ACTIONS, CATEGORIES,
  searchCommands, conversationToCommand, agentToCommand,
} from '@/lib/commands/registry';

interface UseCommandPaletteReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  results: Command[];
  recentCommands: Command[];
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  executeCommand: (command: Command) => void;
  loading: boolean;
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [conversations, setConversations] = useState<Command[]>([]);
  const [agents, setAgents] = useState<Command[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const fetchedRef = useRef(false);

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Fetch data on first open
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    Promise.all([
      fetch('/api/c').then(r => r.json()).catch(() => ({ conversations: [] })),
      fetch('/api/agents?action=suggest&domain=general').then(r => r.json()).catch(() => ({ agents: [] })),
    ]).then(([convData, agentData]) => {
      setConversations(
        (convData.conversations || []).map((c: any) => conversationToCommand(c))
      );
      setAgents(
        (agentData.agents || []).map((a: any) => agentToCommand(a))
      );
      setLoading(false);
    });
  }, [open]);

  // Search results
  const results = query.length >= 1
    ? searchCommands(query, conversations, agents)
    : [];

  // Recent = last 5 conversations
  const recentCommands = conversations.slice(0, 5);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Execute a command
  const executeCommand = useCallback((command: Command) => {
    setOpen(false);
    setQuery('');

    switch (command.type) {
      case 'action':
        switch (command.id) {
          case 'action:new-conversation':
            router.push('/');
            break;
          case 'action:new-simulation':
            router.push('/');
            window.dispatchEvent(new CustomEvent('octux:auto-simulate'));
            break;
          case 'action:toggle-dark-mode':
            toggleTheme();
            break;
          case 'action:shortcuts':
            window.dispatchEvent(new CustomEvent('octux:show-shortcuts'));
            break;
          case 'action:settings':
            window.dispatchEvent(new CustomEvent('octux:open-settings'));
            break;
          case 'action:switch-tier':
            window.dispatchEvent(new CustomEvent('octux:switch-tier'));
            break;
        }
        break;

      case 'conversation':
        router.push(`/c/${command.metadata?.conversationId}`);
        break;

      case 'agent':
        router.push('/');
        window.dispatchEvent(new CustomEvent('octux:agent-context', {
          detail: { agentId: command.metadata?.agentId, agentName: command.label },
        }));
        break;

      case 'category':
        router.push('/');
        window.dispatchEvent(new CustomEvent('octux:category-filter', {
          detail: { category: command.category },
        }));
        break;
    }
  }, [router, toggleTheme]);

  return {
    open, setOpen,
    query, setQuery,
    results, recentCommands,
    selectedIndex, setSelectedIndex,
    executeCommand,
    loading,
  };
}
