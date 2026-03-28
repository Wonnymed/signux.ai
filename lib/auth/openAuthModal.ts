'use client';

/** Opens the global auth modal (AuthProvider). `tab` defaults to sign-up for conversion. */
export function openAuthModal(opts?: { tab?: 'signin' | 'signup' }) {
  if (typeof window === 'undefined') return;
  const mode = opts?.tab === 'signin' ? 'login' : 'signup';
  window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode } }));
}

export const HERO_QUESTION_KEY = 'octux_hero_question';
export const POST_AUTH_REDIRECT_KEY = 'octux_post_auth_redirect';
