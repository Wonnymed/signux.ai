'use client';

import { useRef, useEffect } from 'react';
import { useSimulationStore } from '@/lib/store/simulation';

export interface ConsensusSnapshot {
  round: number;
  proceed: number;
  delay: number;
  abandon: number;
  avgConfidence: number;
}

/**
 * Accumulates consensus snapshots as the simulation progresses.
 * Returns the full history array for sparkline rendering.
 * Resets when simulation resets.
 */
export function useConsensusHistory(): ConsensusSnapshot[] {
  const consensus = useSimulationStore((s) => s.consensus);
  const status = useSimulationStore((s) => s.status);
  const historyRef = useRef<ConsensusSnapshot[]>([]);
  const lastRoundRef = useRef<number>(-1);

  // Reset on new simulation
  useEffect(() => {
    if (status === 'idle' || status === 'connecting') {
      historyRef.current = [];
      lastRoundRef.current = -1;
    }
  }, [status]);

  // Accumulate snapshots
  useEffect(() => {
    if (consensus && consensus.round !== lastRoundRef.current) {
      lastRoundRef.current = consensus.round;
      historyRef.current = [
        ...historyRef.current,
        {
          round: consensus.round,
          proceed: consensus.proceed,
          delay: consensus.delay,
          abandon: consensus.abandon,
          avgConfidence: consensus.avgConfidence,
        },
      ];
    }
  }, [consensus]);

  return historyRef.current;
}
