'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useHydrate } from '@/lib/hooks/useHydrate';
import { useAppStore } from '@/lib/store/app';

interface HydrateClientProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export default function HydrateClient({ isAuthenticated, children }: HydrateClientProps) {
  // Hydrate stores on mount
  useHydrate(isAuthenticated);

  // Re-fetch conversations on route change (e.g., after creating a new conversation)
  const pathname = usePathname();
  const fetchConversations = useAppStore((s) => s.fetchConversations);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [pathname, isAuthenticated, fetchConversations]);

  return <>{children}</>;
}
