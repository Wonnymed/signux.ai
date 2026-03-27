'use client';

import { cn } from '@/lib/design/cn';
import { OctButton } from '@/components/octux';

interface LiveExampleProps {
  onSignIn: () => void;
}

export default function LiveExample({ onSignIn }: LiveExampleProps) {
  const verdict = {
    question: 'Should I open a coffee shop in Gangnam, Seoul?',
    recommendation: 'PROCEED',
    probability: 72,
    grade: 'B+',
    one_liner: 'Market conditions and foot traffic favor a specialty coffee concept, but permit timelines and rent escalation require a 6-month buffer.',
    risk: 'Gangnam commercial rent increases averaging 8% YoY could erode margins by month 18',
    action: 'Secure lease with 2-year rent cap clause before market shifts in Q3',
    agents: [
      { name: 'Base Rate Archivist', position: 'PROCEED', confidence: 8 },
      { name: 'Regulatory Gatekeeper', position: 'DELAY', confidence: 9 },
      { name: 'Demand Signal Analyst', position: 'PROCEED', confidence: 7 },
      { name: 'Unit Economics Auditor', position: 'PROCEED', confidence: 6 },
      { name: 'Execution Operator', position: 'PROCEED', confidence: 7 },
    ],
  };

  return (
    <section id="live-example" className="py-20 sm:py-28 px-6 bg-surface-1/30">
      <div className="max-w-container-narrow mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-medium text-txt-primary mb-3">
            See a real analysis
          </h2>
          <p className="text-sm text-txt-tertiary">
            This is actual Octux output. Hover the citations. Explore the agents.
          </p>
        </div>

        {/* Question */}
        <div className="mb-4 text-center">
          <span className="text-xs text-txt-disabled uppercase tracking-wider">Question</span>
          <p className="text-base text-txt-primary mt-1">{verdict.question}</p>
        </div>

        {/* Verdict card */}
        <div className="rounded-radius-xl border border-accent/15 bg-surface-1 overflow-hidden shadow-premium">
          <div className="grid grid-cols-2 gap-0 border-b border-border-subtle sm:grid-cols-4">
            <Metric label="Probabilidade" value={`${verdict.probability}%`} />
            <Metric label="Grau" value={verdict.grade} />
            <Metric label="Posicao" value={verdict.recommendation} />
            <Metric label="Agentes" value="10" />
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full border-4 border-verdict-proceed flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-verdict-proceed">{verdict.probability}%</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-verdict-proceed-muted text-verdict-proceed">
                  {verdict.recommendation}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-2 text-txt-secondary">
                  {verdict.grade}
                </span>
              </div>
              <p className="text-sm text-txt-primary leading-relaxed mb-3">{verdict.one_liner}</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-micro font-medium text-verdict-abandon shrink-0 mt-0.5">RISK</span>
                  <span className="text-xs text-txt-secondary">{verdict.risk}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-micro font-medium text-verdict-proceed shrink-0 mt-0.5">ACTION</span>
                  <span className="text-xs text-txt-secondary">{verdict.action}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Agent strip */}
          <div className="px-6 py-3 border-t border-border-subtle">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {verdict.agents.map((a, i) => (
                <div key={i} className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2/50">
                  <div className="w-4 h-4 rounded-full bg-accent/60" />
                  <span className="text-micro text-txt-secondary whitespace-nowrap">{a.name.split(' ').slice(0, 2).join(' ')}</span>
                  <span className={cn(
                    'text-[9px] font-medium px-1 rounded-sm',
                    a.position === 'PROCEED' ? 'text-verdict-proceed' : 'text-verdict-delay',
                  )}>{a.position}</span>
                </div>
              ))}
              <span className="shrink-0 text-micro text-txt-disabled">+5 more</span>
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 py-4 border-t border-border-subtle text-center bg-accent-subtle/30">
            <OctButton variant="default" size="md" onClick={onSignIn}>
              Try your own decision &rarr;
            </OctButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 text-center">
      <div className="text-micro text-txt-disabled">{label}</div>
      <div className="mt-0.5 text-xs font-medium text-txt-primary">{value}</div>
    </div>
  );
}
