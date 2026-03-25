/**
 * Shared in-memory store for HITL promise resolution.
 * Both the SSE stream route and the HITL response route access this.
 *
 * LIMITATION: Works on single-server deployments. For production scale,
 * replace with Redis pub/sub or Supabase Realtime.
 */

import type { HITLResponse } from './hitl';

export const hitlStore = new Map<string, {
  resolve: (response: HITLResponse) => void;
  timeout: NodeJS.Timeout;
}>();
