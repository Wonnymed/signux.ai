'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createBrowserClient } from '@/lib/auth/supabase-client';
import AuthModal from './AuthModal';
import CommandPalette from '@/app/components/shell/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import type { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  checkGuestLimit: () => boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null, isAuthenticated: false, isLoading: true,
  signOut: async () => {}, checkGuestLimit: () => true,
});

export const useAuth = () => useContext(AuthContext);

const GUEST_SIM_LIMIT = 1;
const GUEST_SIM_KEY = 'octux_guest_sims';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
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
      const ce = e as CustomEvent<{ mode?: string }>;
      const m = ce.detail?.mode;
      setAuthModalMode(m === 'login' ? 'signin' : 'signup');
      setShowAuthModal(true);
    };
    window.addEventListener('sukgo:show-auth', onShowAuth);
    window.addEventListener('octux:show-auth', onShowAuth);
    return () => {
      window.removeEventListener('sukgo:show-auth', onShowAuth);
      window.removeEventListener('octux:show-auth', onShowAuth);
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const checkGuestLimit = useCallback(() => {
    if (user) return true;
    const guestSims = parseInt(localStorage.getItem(GUEST_SIM_KEY) || '0', 10);
    if (guestSims >= GUEST_SIM_LIMIT) {
      setShowAuthModal(true);
      return false;
    }
    localStorage.setItem(GUEST_SIM_KEY, String(guestSims + 1));
    return true;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signOut, checkGuestLimit }}>
      {children}
      <AuthModal
        isOpen={showAuthModal}
        initialMode={authModalMode}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => {
          setShowAuthModal(false);
          localStorage.removeItem(GUEST_SIM_KEY);
        }}
      />
      <CommandPalette isOpen={paletteOpen} onClose={closePalette} />
    </AuthContext.Provider>
  );
}
