'use client';

import OperatorWizard from '@/components/operator/OperatorWizard';

export default function OperatorPage() {
  return (
    <div
      data-octux-settings
      className="flex min-h-0 w-full flex-1 flex-col bg-[#0a0a0f] px-4 py-8 md:px-10"
    >
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="text-xl font-medium tracking-tight text-white">My Operator</h1>
        <p className="mt-1 text-sm text-white/40">
          Your adaptive profile — Octux uses this to tailor simulations to your situation.
        </p>
        <div className="mt-8">
          <OperatorWizard />
        </div>
      </div>
    </div>
  );
}
