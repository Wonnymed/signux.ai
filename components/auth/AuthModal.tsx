'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/auth/supabase-client';

type Props = { isOpen: boolean; onClose: () => void; onAuthSuccess: () => void };

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const supabase = createBrowserClient();

  if (!isOpen) return null;

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMessage('Check your email for the login link.');
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong.');
    } finally { setLoading(false); }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage(err.message || 'Google sign-in failed.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-0, #fff)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Save your simulations and build decision memory
          </div>
        </div>

        <button onClick={handleGoogleAuth} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default, rgba(0,0,0,0.1))', background: 'var(--surface-1, #f9f9f8)', cursor: loading ? 'wait' : 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
        </div>

        <form onSubmit={handleEmailAuth}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--surface-0)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          <button type="submit" disabled={loading || !email} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', marginTop: '12px', background: '#7C3AED', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', opacity: loading || !email ? 0.6 : 1 }}>
            {loading ? 'Sending...' : 'Continue with email'}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'var(--surface-2)', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {mode === 'signup' ? (
            <>Already have an account? <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', fontSize: '13px' }}>Sign in</button></>
          ) : (
            <>New to Octux? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', fontSize: '13px' }}>Create account</button></>
          )}
        </div>
      </div>
    </div>
  );
}
