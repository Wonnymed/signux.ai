const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Short URL-safe id (default 10 chars). */
export function generateShareId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
