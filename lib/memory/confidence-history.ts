/** Normalize decision_opinions.confidence_history from JSONB (array or legacy string). */
export function confidenceHistoryArray(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? (p as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
