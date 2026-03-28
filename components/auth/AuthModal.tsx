'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createBrowserClient } from '@/lib/auth/supabase-client';
import { EASE_OUT } from '@/lib/motion/constants';

type Props = { isOpen: boolean; onClose: () => void; onAuthSuccess: () => void };

export default function AuthModal({ isOpen, onClose, onAuthSuccess: _onAuthSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const supabase = createBrowserClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMessage('Check your email for the login link.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-surface-overlay/80 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="relative z-10 w-full max-w-[400px] rounded-2xl border border-border-subtle bg-surface-raised p-8 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 text-center">
              <div className="text-2xl font-light text-txt-primary">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </div>
              <div className="mt-2 text-sm text-txt-secondary">
                Save your simulations and build decision memory
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-surface-1 px-3 py-3 text-sm font-medium text-txt-primary disabled:cursor-wait"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border-default" />
              <span className="text-xs text-txt-tertiary">or</span>
              <div className="h-px flex-1 bg-border-default" />
            </div>

            <form onSubmit={handleEmailAuth}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="box-border w-full rounded-lg border border-border-default bg-surface-0 px-3 py-3 text-sm text-txt-primary outline-none"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="mt-3 w-full rounded-lg bg-accent py-3 text-sm font-medium text-txt-on-accent disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Continue with email'}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-center text-sm text-txt-secondary">
                {message}
              </div>
            )}

            <div className="mt-4 text-center text-sm text-txt-tertiary">
              {mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-accent hover:underline"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New to Octux?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-accent hover:underline"
                  >
                    Create account
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
