/** Canonical public origin for share links and OG images. */
export function getPublicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://signux-ai.vercel.app';
  return raw.replace(/\/$/, '');
}
