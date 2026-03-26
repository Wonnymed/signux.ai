'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/design/cn';
import { verdictColors } from '@/lib/design/tokens';

interface ConsensusSnapshot {
  round: number;
  proceed: number;
  delay: number;
  abandon: number;
}

interface ConsensusSparklineProps {
  history: ConsensusSnapshot[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Mini sparkline showing how consensus shifted across rounds.
 * Each round is a thin vertical stacked bar.
 */
export default function ConsensusSparkline({
  history,
  width = 200,
  height = 40,
  className,
}: ConsensusSparklineProps) {
  if (!history || history.length === 0) return null;

  const barWidth = Math.max(2, Math.min(12, (width - (history.length - 1) * 2) / history.length));
  const gap = 2;

  return (
    <div className={cn('inline-flex items-end', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {history.map((snap, i) => {
          const x = i * (barWidth + gap);
          const total = snap.proceed + snap.delay + snap.abandon;
          if (total === 0) return null;

          const pH = (snap.proceed / total) * height;
          const dH = (snap.delay / total) * height;
          const aH = (snap.abandon / total) * height;

          return (
            <g key={i}>
              {/* Proceed (bottom) */}
              <motion.rect
                x={x}
                initial={{ y: height, height: 0 }}
                animate={{ y: height - pH, height: pH }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                width={barWidth}
                rx={1}
                fill={verdictColors.proceed.solid}
                opacity={0.8}
              />
              {/* Delay (middle) */}
              <motion.rect
                x={x}
                initial={{ y: height - pH, height: 0 }}
                animate={{ y: height - pH - dH, height: dH }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                width={barWidth}
                rx={1}
                fill={verdictColors.delay.solid}
                opacity={0.8}
              />
              {/* Abandon (top) */}
              <motion.rect
                x={x}
                initial={{ y: height - pH - dH, height: 0 }}
                animate={{ y: height - pH - dH - aH, height: aH }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                width={barWidth}
                rx={1}
                fill={verdictColors.abandon.solid}
                opacity={0.8}
              />
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-1 ml-2">
        <span className="text-micro text-txt-disabled">
          {history.length} rounds
        </span>
      </div>
    </div>
  );
}
