'use client';

import { useBillingStore } from '@/lib/store/billing';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import TopBar from '@/components/dashboard/TopBar';
import SimulationInput from '@/components/dashboard/SimulationInput';
import SimulationCanvas from '@/components/dashboard/SimulationCanvas';

export default function DashboardHome({
  onSubmit,
  loading,
}: {
  onSubmit: (message: string) => void | Promise<void>;
  loading: boolean;
}) {
  const tier = useBillingStore((s) => s.tier);
  const activeTier = useDashboardUiStore((s) => s.activeTier);
  const setActiveTier = useDashboardUiStore((s) => s.setActiveTier);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar activeTier={activeTier} onTierChange={setActiveTier} billingTier={tier} />
      <SimulationInput
        loading={loading}
        billingTier={tier}
        onRun={async ({ message }) => {
          await onSubmit(message);
        }}
      />
      <SimulationCanvas />
    </div>
  );
}
