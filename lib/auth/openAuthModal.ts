'use client';

/** Opens the global auth modal (AuthProvider). `tab` defaults to sign-up for conversion. */
export function openAuthModal(opts?: { tab?: 'signin' | 'signup' }) {
  if (typeof window === 'undefined') return;
  const mode = opts?.tab === 'signin' ? 'login' : 'signup';
  window.dispatchEvent(new CustomEvent('sukgo:show-auth', { detail: { mode } }));
}

export const HERO_QUESTION_KEY = 'sukgo_hero_question';
export const POST_AUTH_REDIRECT_KEY = 'sukgo_post_auth_redirect';
