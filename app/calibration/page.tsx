'use client';

import { useState, useEffect } from 'react';
import AgentPerformanceTable from '@/components/calibration/AgentPerformanceTable';
import BrierChart from '@/components/calibration/BrierChart';
import OutcomeTracker from '@/components/calibration/OutcomeTracker';
import OptimizationLog from '@/components/calibration/OptimizationLog';
import MemoryHealth from '@/components/calibration/MemoryHealth';

type OptReport = {
  totalSims: number;
  agents: {
    agentId: string;
    agentName: string;
    currentVersion: number;
    avgScore: number | null;
    simCount: number;
    versionHistory: { version: number; source: string; avgScore: number | null; simCount: number; promotedAt: string | null }[];
  }[];
  recentCycles: {
    id: string;
    trigger: string;
    agentsOptimized: string[];
    agentsRolledBack: string[];
    totalImprovement: number | null;
    createdAt: string;
  }[];
};

type CalData = {
  overallBrier: number;
  totalOutcomes: number;
  correctRate: number;
  recentOutcomes: { question: string; predicted: string; probability: number; outcome: string; brier: number }[];
};

export default function CalibrationPage() {
  const [optReport, setOptReport] = useState<OptReport | null>(null);
  const [calData, setCalData] = useState<CalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/optimization/report').then(r => r.json()),
      fetch('/api/outcomes').then(r => r.json()),
    ]).then(([optResult, calResult]) => {
      if (optResult.status === 'fulfilled') setOptReport(optResult.value);
      if (calResult.status === 'fulfilled') setCalData(calResult.value);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>Calibration Lab</div>
        <div style={{ marginTop: '24px', color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading system data...</div>
      </div>
    );
  }

  const totalSims = optReport?.totalSims || 0;
  const brierScore = calData?.overallBrier ?? 0.25;
  const correctRate = calData?.correctRate ?? 0;
  const totalOutcomes = calData?.totalOutcomes ?? 0;

  const brierGrade = brierScore < 0.15 ? 'A' : brierScore < 0.2 ? 'B' : brierScore < 0.25 ? 'C' : brierScore < 0.35 ? 'D' : 'F';
  const brierColor = brierScore < 0.2 ? '#10B981' : brierScore < 0.3 ? '#F59E0B' : '#F43F5E';

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>Calibration Lab</div>
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          System intelligence metrics — how Octux evolves with every simulation
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <OverviewCard label="Total simulations" value={String(totalSims)} sublabel={totalSims > 0 ? 'decisions analyzed' : 'run your first sim'} />
        <OverviewCard label="Brier score" value={brierScore.toFixed(3)} sublabel={`Grade: ${brierGrade} (0 = perfect)`} valueColor={brierColor} />
        <OverviewCard label="Correct rate" value={totalOutcomes > 0 ? `${Math.round(correctRate * 100)}%` : '—'} sublabel={totalOutcomes > 0 ? `${totalOutcomes} outcomes reported` : 'report outcomes to track'} />
        <OverviewCard label="Agents evolving" value={String(optReport?.agents.filter(a => a.currentVersion > 0).length || 0)} sublabel="of 10 specialists" />
      </div>

      <Section title="Agent performance">
        <AgentPerformanceTable agents={optReport?.agents || []} />
      </Section>

      <Section title="Prediction accuracy">
        <BrierChart outcomes={calData?.recentOutcomes || []} overallBrier={brierScore} />
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <Section title="Outcome tracker">
          <OutcomeTracker outcomes={calData?.recentOutcomes || []} />
        </Section>
        <Section title="Memory health">
          <MemoryHealth />
        </Section>
      </div>

      <Section title="Optimization cycles">
        <OptimizationLog cycles={optReport?.recentCycles || []} />
      </Section>
    </div>
  );
}

function OverviewCard({ label, value, sublabel, valueColor }: { label: string; value: string; sublabel: string; valueColor?: string }) {
  return (
    <div style={{
      padding: '20px', borderRadius: '12px',
      border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
      background: 'var(--surface-0, #fff)',
    }}>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 300, color: valueColor || 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{sublabel}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>{title}</div>
      {children}
    </div>
  );
}
