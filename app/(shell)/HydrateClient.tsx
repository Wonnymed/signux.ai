'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useHydrate } from '@/lib/hooks/useHydrate';
import { migrateStorageKeys } from '@/lib/storage-migration';
import { useAppStore } from '@/lib/store/app';
import { readConversationCache } from '@/lib/conversations-cache';
import type { ConversationSummary } from '@/lib/store/app';

interface HydrateClientProps {
  isAuthenticated: boolean;
  /** Server-fetched list when logged in; omit for guests (client + cache only) */
  initialConversations?: ConversationSummary[];
  children: React.ReactNode;
}

export default function HydrateClient({
  isAuthenticated,
  initialConversations,
  children,
}: HydrateClientProps) {
  useHydrate(isAuthenticated);

  useEffect(() => {
    migrateStorageKeys();
  }, []);

  const pathname = usePathname();
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const setConversations = useAppStore((s) => s.setConversations);
  const setConversationsLoading = useAppStore((s) => s.setConversationsLoading);

  // Sync store before paint: server data (auth) or localStorage (guest) — avoids empty sidebar flash
  useLayoutEffect(() => {
    if (isAuthenticated && initialConversations !== undefined) {
      setConversations(initialConversations);
      setConversationsLoading(false);
      return;
    }
    if (!isAuthenticated) {
      const cached = readConversationCache();
      if (cached?.length) {
        setConversations(cached);
        setConversationsLoading(false);
      }
    }
  }, [isAuthenticated, initialConversations, setConversations, setConversationsLoading]);

  /**
   * Single /api/c source:
   * - Guest: fetch on mount + pathname change
   * - Auth: first run = silent revalidate (list already from server); later = fetch on pathname change only
   */
  const pathForAuth = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      fetchConversations();
      return;
    }

    if (pathForAuth.current === null) {
      pathForAuth.current = pathname;
      fetchConversations({ silent: true });
      return;
    }

    if (pathForAuth.current !== pathname) {
      pathForAuth.current = pathname;
      fetchConversations();
    }
  }, [pathname, isAuthenticated, fetchConversations]);

  return <>{children}</>;
}
