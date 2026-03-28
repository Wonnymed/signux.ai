'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/auth/supabase-client';
import AuthModal from './AuthModal';
import CommandPalette from '@/app/components/shell/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import type { User } from '@supabase/supabase-js';
import { POST_AUTH_REDIRECT_KEY } from '@/lib/auth/openAuthModal';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  /** @deprecated No anonymous usage — returns false when logged out (does not open the modal). */
  checkGuestLimit: () => boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null, isAuthenticated: false, isLoading: true,
  signOut: async () => {}, checkGuestLimit: () => false,
});

export const useAuth = () => useContext(AuthContext);

function PostAuthRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    try {
      const path = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
      if (path?.startsWith('/')) {
        sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        router.push(path);
      }
    } catch {
      /* private mode */
    }
  }, [isAuthenticated, isLoading, router]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<'signin' | 'signup'>('signup');
  const supabase = createBrowserClient();
  const { isOpen: paletteOpen, open: openPalette, close: closePalette } = useCommandPalette();
  useGlobalShortcuts(openPalette);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) setShowAuthModal(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onShowAuth = (e: Event) => {
      const d = (e as CustomEvent<{ mode?: string }>).detail;
      const tab = d?.mode === 'login' ? 'signin' : 'signup';
      setAuthModalDefaultTab(tab);
      setShowAuthModal(true);
    };
    window.addEventListener('octux:show-auth', onShowAuth);
    return () => window.removeEventListener('octux:show-auth', onShowAuth);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  /** Logged-out users must sign in — no guest simulations. */
  const checkGuestLimit = useCallback(() => !!user, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signOut, checkGuestLimit }}>
      {children}
      <PostAuthRedirect />
      <AuthModal
        isOpen={showAuthModal}
        defaultTab={authModalDefaultTab}
        onClose={() => setShowAuthModal(false)}
      />
      <CommandPalette isOpen={paletteOpen} onClose={closePalette} />
    </AuthContext.Provider>
  );
}
