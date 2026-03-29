'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useBillingStore } from '@/lib/store/billing';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import SimulationInput from '@/components/dashboard/SimulationInput';
import SimulationCanvas from '@/components/dashboard/SimulationCanvas';

export default function DashboardHome({
  onRunDashboard,
  loading,
}: {
  onRunDashboard: () => void | Promise<void>;
  loading: boolean;
}) {
  const tier = useBillingStore((s) => s.tier);
  const activeMode = useDashboardUiStore((s) => s.activeMode);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex min-h-0 shrink-0 flex-col"
        >
          <SimulationInput loading={loading} billingTier={tier} onRun={onRunDashboard} />
        </motion.div>
      </AnimatePresence>
      <div
        className="mx-4 my-3 shrink-0 border-t sm:mx-5"
        style={{ borderColor: 'rgba(255,255,255,0.04)' }}
        aria-hidden
      />
      <SimulationCanvas />
    </div>
  );
}
