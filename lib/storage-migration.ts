/**
 * One-time localStorage key migration (Signux/Octux → Sukgo).
 * Safe to call on every app load; only copies when new key is empty.
 */
export function migrateStorageKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const migrations: [string, string][] = [
    ['signux-theme', 'sukgo:theme'],
    ['octux:theme', 'sukgo:theme'],
    ['octux-theme', 'sukgo:theme'],
    ['signux-conversations', 'sukgo:conversations'],
    ['signux-guest-tokens', 'sukgo:guest-tokens'],
  ];

  for (const [oldKey, newKey] of migrations) {
    try {
      const value = localStorage.getItem(oldKey);
      if (value !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value);
      }
    } catch {
      /* quota / private mode */
    }
  }
}
