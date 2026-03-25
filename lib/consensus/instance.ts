/**
 * Singleton ConsensusTracker instance for API routes.
 * In production, state would be backed by shared storage.
 */

import { ConsensusTracker } from './tracker';

// Use globalThis to persist across hot reloads in dev
const globalForTracker = globalThis as unknown as { __consensusTracker?: ConsensusTracker };

export function getTracker(): ConsensusTracker {
  if (!globalForTracker.__consensusTracker) {
    globalForTracker.__consensusTracker = new ConsensusTracker();
  }
  return globalForTracker.__consensusTracker;
}
