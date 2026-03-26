import { cn } from '@/lib/design/cn';

const steps = [
  {
    number: '01',
    title: 'You ask',
    description: 'Type any decision — investment, career, relationship, business. No formatting needed.',
    visual: 'input',
    example: '"Should I invest $50K in rental property in Gangnam?"',
  },
  {
    number: '02',
    title: '10 specialists debate',
    description: 'AI agents with distinct expertise analyze, challenge, and stress-test your decision in real-time.',
    visual: 'agents',
    example: 'Base Rate Archivist \u00B7 Regulatory Gatekeeper \u00B7 Demand Signal Analyst \u00B7 7 more',
  },
  {
    number: '03',
    title: 'You get a verdict',
    description: 'A probability-graded verdict with every claim traceable to the agent who made it.',
    visual: 'verdict',
    example: 'PROCEED WITH CONDITIONS (72%) \u00B7 Grade B+ \u00B7 4 citations',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="section-divider mb-12 opacity-80" aria-hidden />
        <div className="text-center mb-16">
          <h2 className="marketing-heading sm:text-3xl">
            How it works
          </h2>
          <p className="text-sm text-txt-tertiary max-w-md mx-auto">
            From question to verdict in 60 seconds. Every claim backed by a specialist.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16 sm:space-y-24">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col sm:flex-row items-center gap-8 sm:gap-12',
                i % 2 === 1 && 'sm:flex-row-reverse',
              )}
            >
              {/* Text side */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-3 justify-center sm:justify-start mb-3">
                  <span className="text-micro font-bold text-accent tracking-widest">{step.number}</span>
                  <h3 className="text-xl font-medium text-txt-primary">{step.title}</h3>
                </div>
                <p className="text-sm text-txt-secondary leading-relaxed mb-3">{step.description}</p>
                <p className="text-xs text-txt-tertiary italic">{step.example}</p>
              </div>

              {/* Visual side */}
              <div className="flex-1 w-full max-w-sm">
                <StepVisual type={step.visual} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepVisual({ type }: { type: string }) {
  if (type === 'input') {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-0 px-4 py-3">
          <span className="text-sm text-txt-secondary flex-1">Should I invest $50K in rental property?</span>
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5"><path d="M6 10V2M3 5l3-3 3 3" /></svg>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'agents') {
    const agents = [
      { name: 'Base Rate Archivist', pos: 'PROCEED', conf: 8, color: '#6366F1' },
      { name: 'Regulatory Gatekeeper', pos: 'DELAY', conf: 9, color: '#F59E0B' },
      { name: 'Demand Signal Analyst', pos: 'PROCEED', conf: 7, color: '#10B981' },
    ];
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-2">
        {agents.map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-0">
            <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-xs text-txt-primary flex-1 truncate">{a.name}</span>
            <span className={cn(
              'text-micro font-medium px-1.5 py-0.5 rounded-sm',
              a.pos === 'PROCEED' ? 'bg-verdict-proceed-muted text-verdict-proceed' : 'bg-verdict-delay-muted text-verdict-delay',
            )}>{a.pos}</span>
            <span className="text-micro text-txt-disabled">{a.conf}/10</span>
          </div>
        ))}
        <p className="text-micro text-txt-disabled text-center pt-1">+ 7 more specialists debating...</p>
      </div>
    );
  }

  if (type === 'verdict') {
    return (
      <div className="rounded-xl border border-accent/20 bg-surface-1 p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-verdict-proceed flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-verdict-proceed">72%</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-micro font-bold px-2 py-0.5 rounded-sm bg-verdict-proceed-muted text-verdict-proceed">PROCEED</span>
              <span className="text-micro font-medium px-1.5 py-0.5 rounded-sm bg-surface-2 text-txt-secondary">B+</span>
            </div>
            <p className="text-xs text-txt-secondary leading-relaxed">
              Market conditions favor launch
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-accent-muted text-accent text-[9px] font-bold mx-0.5 align-super">1</span>
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-accent-muted text-accent text-[9px] font-bold mx-0.5 align-super">3</span>
              , but permit timeline adds risk
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-accent-muted text-accent text-[9px] font-bold mx-0.5 align-super">2</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
