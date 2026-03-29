'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import { useBillingStore } from '@/lib/store/billing';
import { cn } from '@/lib/design/cn';

const STORAGE_KEY = 'sukgo_operator';

export type OperatorTypeId = 'business' | 'building' | 'deals' | 'career';

const TYPE_CARDS: {
  id: OperatorTypeId;
  emoji: string;
  title: string;
  subtitle: string;
}[] = [
  { id: 'business', emoji: '🏢', title: 'I run a business', subtitle: 'Active business decisions' },
  { id: 'building', emoji: '💡', title: "I'm building something", subtitle: 'Pre-launch validation' },
  { id: 'deals', emoji: '📊', title: 'I evaluate deals', subtitle: 'Investment due diligence' },
  { id: 'career', emoji: '🧭', title: 'Career decision', subtitle: 'Job, move, or pivot' },
];

const inputClass =
  'w-full rounded-xl border border-[#3a3a36] bg-[#1a1a18] px-4 py-3 text-[14px] text-[#f5f5f0] outline-none transition-colors placeholder:text-white/25 focus:border-[#c9a96e]/40';

export default function OperatorOnboarding() {
  const { user } = useAuth();
  const setModeNavFocus = useDashboardUiStore((s) => s.setModeNavFocus);
  const setActiveMode = useDashboardUiStore((s) => s.setActiveMode);
  const fetchBalance = useBillingStore((s) => s.fetchBalance);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [operatorType, setOperatorType] = useState<OperatorTypeId | ''>('');
  const [industry, setIndustry] = useState('');
  const [decisionContext, setDecisionContext] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistLocal = useCallback(() => {
    try {
      const payload = {
        name,
        location,
        operatorType,
        industry,
        decisionContext,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* */
    }
  }, [name, location, operatorType, industry, decisionContext]);

  const goNextFrom1 = () => {
    if (!name.trim() || !location.trim()) {
      setError('Name and location are required.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const goNextFrom2 = () => {
    if (!operatorType) {
      setError('Choose what brings you here.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const complete = async () => {
    if (!operatorType) return;
    setSubmitting(true);
    setError(null);
    persistLocal();
    try {
      if (user) {
        const res = await fetch('/api/user/operator-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            location: location.trim(),
            operatorType,
            industry: industry.trim(),
            decisionContext: decisionContext.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Save failed');
        void fetchBalance();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setSubmitting(false);
      return;
    }

    setModeNavFocus('mode');
    setActiveMode('simulate');
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 pt-6 sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex justify-center gap-2">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={cn(
                'h-2 w-8 rounded-full transition-colors',
                step >= s ? 'bg-[#c9a96e]' : 'bg-[#3a3a36]',
              )}
              aria-hidden
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <h1 className="text-[20px] font-medium text-[#f5f5f0]">Let&apos;s personalize your simulations</h1>
            <p className="mt-1 text-[13px] text-[#8a8a82]">Step 1 of 3</p>
            <p className="mt-4 rounded-lg border border-[#c9a96e]/20 bg-[#c9a96e]/[0.06] px-3 py-2 text-[12px] text-[#c9a96e]/90">
              🎁 Complete all 3 steps to earn 1 free simulation token
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/40">Name</label>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/40">Location</label>
                <input
                  className={inputClass}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, country"
                  autoComplete="address-level1"
                />
              </div>
            </div>
            {error ? <p className="mt-3 text-[13px] text-red-400/90">{error}</p> : null}
            <button
              type="button"
              onClick={goNextFrom1}
              className="mt-8 w-full rounded-xl bg-[#c9a96e] py-3 text-[14px] font-semibold text-[#0a0a0f] transition-colors hover:bg-[#b8994f]"
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[20px] font-medium text-[#f5f5f0]">What brings you to Sukgo?</h1>
            <p className="mt-1 text-[13px] text-[#8a8a82]">Step 2 of 3</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TYPE_CARDS.map((c) => {
                const selected = operatorType === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setOperatorType(c.id);
                      setError(null);
                    }}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all',
                      selected
                        ? 'border-[#c9a96e]/40 bg-[#c9a96e]/[0.06] text-[#c9a96e]'
                        : 'border-[#3a3a36] bg-[#1a1a18] text-[#f5f5f0] hover:border-[#c9a96e]/20',
                    )}
                  >
                    <span className="text-[20px]" aria-hidden>
                      {c.emoji}
                    </span>
                    <div className="mt-2 text-[14px] font-medium">{c.title}</div>
                    <div className="mt-0.5 text-[12px] opacity-70">{c.subtitle}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6">
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/40">
                Industry (optional)
              </label>
              <input
                className={inputClass}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. F&B, SaaS, retail"
              />
            </div>
            {error ? <p className="mt-3 text-[13px] text-red-400/90">{error}</p> : null}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-[#3a3a36] py-3 text-[14px] font-medium text-[#c0c0b8] hover:bg-white/[0.04]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNextFrom2}
                className="flex-1 rounded-xl bg-[#c9a96e] py-3 text-[14px] font-semibold text-[#0a0a0f] hover:bg-[#b8994f]"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-[20px] font-medium text-[#f5f5f0]">What are you working on?</h1>
            <p className="mt-1 text-[13px] text-[#8a8a82]">Step 3 of 3</p>
            <div className="mt-6">
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/40">
                Current decision (optional)
              </label>
              <textarea
                className={cn(inputClass, 'min-h-[120px] resize-y')}
                value={decisionContext}
                onChange={(e) => setDecisionContext(e.target.value)}
                placeholder="What decision are you trying to get right?"
              />
            </div>
            {error ? <p className="mt-3 text-[13px] text-red-400/90">{error}</p> : null}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-[#3a3a36] py-3 text-[14px] font-medium text-[#c0c0b8] hover:bg-white/[0.04] disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void complete()}
                disabled={submitting}
                className="flex-1 rounded-xl bg-[#c9a96e] py-3 text-[14px] font-semibold text-[#0a0a0f] hover:bg-[#b8994f] disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Complete setup 🎁'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
