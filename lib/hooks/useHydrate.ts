'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/app';
import { useBillingStore } from '@/lib/store/billing';

/**
 * Hydrate all stores on app mount.
 * Call this ONCE in the shell layout.
 */
export function useHydrate(isAuthenticated: boolean) {
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const fetchBalance = useBillingStore((s) => s.fetchBalance);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
      fetchBalance();
    }
  }, [isAuthenticated, fetchConversations, fetchBalance]);
}
