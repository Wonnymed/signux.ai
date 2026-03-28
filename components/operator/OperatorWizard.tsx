'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Building2, Compass, Lightbulb, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBillingStore } from '@/lib/store/billing';
import { cn } from '@/lib/design/cn';
import { emptyOperatorProfile } from '@/lib/operator/defaults';
import { validateRequired } from '@/lib/operator/validation';
import type { OperatorProfile, OperatorType } from '@/lib/operator/types';

const terracotta = '#e8593c';

const SCREEN_MOTION = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

const REWARD_TEASER = '🎁 Complete all 3 steps to earn 1 free simulation token';

function PillRow({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-full border px-4 py-2 text-[13px] transition-all',
            value === opt
              ? 'border-[#e8593c]/40 bg-[#e8593c]/20 text-[#e8593c]'
              : 'border-white/[0.08] bg-white/[0.04] text-white/50 hover:border-white/20',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function fieldInputClass(invalid?: boolean) {
  return cn(
    'w-full rounded-xl border bg-white/[0.03] px-3 py-2.5 text-[14px] text-white/90 placeholder:text-white/25 outline-none transition-colors',
    invalid ? 'border-red-500/40' : 'border-white/[0.08] focus:border-white/20',
  );
}

function step2BranchComplete(p: OperatorProfile): boolean {
  switch (p.operatorType) {
    case 'business_owner':
      return !!(p.industry?.trim() && p.businessStage?.trim() && p.currentFocus?.trim());
    case 'aspiring':
      return !!(p.businessIdea?.trim() && p.stage?.trim() && p.availableCapital?.trim());
    case 'investor':
      return !!(p.investorType?.trim() && p.checkSize?.trim() && p.currentEvaluation?.trim());
    case 'career':
      return !!(p.currentRole?.trim() && p.decisionContext?.trim());
    default:
      return false;
  }
}

const TYPE_CARDS: {
  id: OperatorType;
  icon: typeof Building2;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'business_owner',
    icon: Building2,
    title: 'I run a business',
    subtitle: '',
  },
  {
    id: 'aspiring',
    icon: Lightbulb,
    title: "I'm building",
    subtitle: 'something',
  },
  {
    id: 'investor',
    icon: TrendingUp,
    title: 'I invest',
    subtitle: '',
  },
  {
    id: 'career',
    icon: Compass,
    title: 'Career',
    subtitle: 'decision',
  },
];

function clearBranchFields(): Pick<
  OperatorProfile,
  | 'industry'
  | 'businessStage'
  | 'currentFocus'
  | 'businessIdea'
  | 'stage'
  | 'availableCapital'
  | 'investorType'
  | 'checkSize'
  | 'currentEvaluation'
  | 'currentRole'
  | 'decisionContext'
> {
  return {
    industry: '',
    businessStage: '',
    currentFocus: '',
    businessIdea: '',
    stage: '',
    availableCapital: '',
    investorType: '',
    checkSize: '',
    currentEvaluation: '',
    currentRole: '',
    decisionContext: '',
  };
}

export default function OperatorWizard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const fetchBalance = useBillingStore((s) => s.fetchBalance);

  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<OperatorProfile>(() => emptyOperatorProfile());
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [step, setStep] = useState(1);
  const [showHints, setShowHints] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claimPhase, setClaimPhase] = useState<'idle' | 'success'>('idle');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const patch = useCallback((p: Partial<OperatorProfile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
  }, []);

  const load = useCallback(async () => {
    const res = await fetch('/api/operator');
    if (!res.ok) throw new Error('load');
    const data = await res.json();
    setProfile(data.profile as OperatorProfile);
    setRewardClaimed(Boolean(data.rewardClaimed));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, load]);

  const validation = useMemo(() => validateRequired(profile), [profile]);

  const screen1Ok = profile.name.trim().length > 0 && profile.location.trim().length > 0;
  const screen2Ok = !!profile.operatorType && step2BranchComplete(profile);

  const saveProfilePut = useCallback(async () => {
    if (!isAuthenticated) return false;
    setSaving(true);
    setInlineError(null);
    try {
      const res = await fetch('/api/operator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error('save');
      return true;
    } catch {
      setInlineError('Could not save. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, profile]);

  const saveAndClaim = useCallback(async () => {
    if (!isAuthenticated) return;
    setShowHints(true);
    if (!validation.complete) return;
    setSaving(true);
    setInlineError(null);
    try {
      const res = await fetch('/api/operator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, claimReward: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInlineError(typeof data.error === 'string' ? data.error : 'Request failed');
        return;
      }
      if (data.reward === 'already_claimed') {
        setRewardClaimed(true);
        await fetchBalance();
        return;
      }
      if (data.reward === 'incomplete') {
        setInlineError('Complete all fields to claim your token.');
        return;
      }
      if (data.reward === 'claimed') {
        setRewardClaimed(true);
        await fetchBalance();
        setClaimPhase('success');
      }
    } catch {
      setInlineError('Network error');
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, profile, validation.complete, fetchBalance, router]);

  useEffect(() => {
    if (claimPhase !== 'success') return;
    const id = window.setTimeout(() => router.push('/'), 1500);
    return () => window.clearTimeout(id);
  }, [claimPhase, router]);

  if (authLoading || !loaded) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 rounded-lg bg-white/[0.06]" />
        <div className="h-40 rounded-lg bg-white/[0.04]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-white/45">
        Sign in to build your Operator profile — it personalizes every simulation.
      </p>
    );
  }

  if (claimPhase === 'success') {
    return (
      <div className="space-y-6 text-center">
        <p className="text-lg font-medium text-white">Profile saved · 1 token added</p>
        <p className="text-sm text-white/45">Redirecting to dashboard…</p>
        <div
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#14141c] px-4 py-3 text-sm text-white/90 shadow-lg"
          role="status"
        >
          🎉 +1 token added to your balance
        </div>
      </div>
    );
  }

  if (rewardClaimed) {
    return (
      <ClaimedEditor
        profile={profile}
        patch={patch}
        saving={saving}
        inlineError={inlineError}
        onSave={() => void saveProfilePut()}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[520px] pb-16">
      {inlineError ? <p className="mb-4 text-center text-sm text-red-400/90">{inlineError}</p> : null}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" {...SCREEN_MOTION} className="space-y-6">
            <header className="space-y-1">
              <p className="text-[15px] font-medium text-white">Let&apos;s personalize your simulations</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white/35">Step 1 of 3</span>
                <StepDots active={1} />
              </div>
            </header>
            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">Your name</span>
              <input
                className={fieldInputClass(showHints && !profile.name.trim())}
                value={profile.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Fernando Polli"
                autoComplete="name"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">Where are you based?</span>
              <input
                className={fieldInputClass(showHints && !profile.location.trim())}
                value={profile.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder="Seoul, South Korea"
                autoComplete="address-level2"
              />
            </label>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!screen1Ok}
                onClick={() => {
                  setShowHints(true);
                  if (screen1Ok) setStep(2);
                }}
                className="rounded-xl bg-white/[0.08] px-5 py-2.5 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Continue →
              </button>
            </div>
            <p className="text-center text-[11px] text-white/30">{REWARD_TEASER}</p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" {...SCREEN_MOTION} className="space-y-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-[12px] text-white/40 hover:text-white/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <header className="space-y-1">
              <p className="text-[15px] font-medium text-white">What brings you to Octux?</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white/35">Step 2 of 3</span>
                <StepDots active={2} />
              </div>
            </header>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_CARDS.map((c) => {
                const Icon = c.icon;
                const selected = profile.operatorType === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => patch({ operatorType: c.id, ...clearBranchFields() })}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all',
                      selected
                        ? 'border-[#e8593c]/45 bg-[#e8593c]/10'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15',
                    )}
                  >
                    <Icon className="h-5 w-5 text-white/70" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium leading-snug text-white/90">
                      {c.title}
                      {c.subtitle ? (
                        <>
                          <br />
                          <span className="font-normal text-white/55">{c.subtitle}</span>
                        </>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {profile.operatorType ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5 border-t border-white/[0.06] pt-5"
                >
                  {profile.operatorType === 'business_owner' && (
                    <>
                      <div className="space-y-2">
                        <span className="text-[13px] text-white/50">What industry?</span>
                        <PillRow
                          options={['Tech', 'F&B', 'Retail', 'Services', 'Manufacturing', 'Other']}
                          value={profile.industry}
                          onChange={(v) => patch({ industry: v })}
                        />
                        {showHints && !profile.industry ? (
                          <p className="text-[11px] text-red-400/80">Pick one</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <span className="text-[13px] text-white/50">Business stage</span>
                        <PillRow
                          options={['Idea', 'Early', 'Growing', 'Established']}
                          value={profile.businessStage}
                          onChange={(v) => patch({ businessStage: v })}
                        />
                        {showHints && !profile.businessStage ? (
                          <p className="text-[11px] text-red-400/80">Pick one</p>
                        ) : null}
                      </div>
                      <label className="block space-y-2">
                        <span className="text-[13px] text-white/50">What&apos;s on your mind?</span>
                        <textarea
                          rows={3}
                          placeholder="e.g. Should I expand to Japan?"
                          className={fieldInputClass(showHints && !profile.currentFocus.trim())}
                          value={profile.currentFocus}
                          onChange={(e) => patch({ currentFocus: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                  {profile.operatorType === 'aspiring' && (
                    <>
                      <label className="block space-y-2">
                        <span className="text-[13px] text-white/50">What&apos;s the idea?</span>
                        <textarea
                          rows={3}
                          placeholder="e.g. AI tutoring app for Korean students"
                          className={fieldInputClass(showHints && !profile.businessIdea.trim())}
                          value={profile.businessIdea}
                          onChange={(e) => patch({ businessIdea: e.target.value })}
                        />
                      </label>
                      <div className="space-y-2">
                        <span className="text-[13px] text-white/50">How far along?</span>
                        <PillRow
                          options={['Just an idea', 'Researching', 'Building', 'Launched']}
                          value={profile.stage}
                          onChange={(v) => patch({ stage: v })}
                        />
                        {showHints && !profile.stage ? (
                          <p className="text-[11px] text-red-400/80">Pick one</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <span className="text-[13px] text-white/50">Available capital</span>
                        <PillRow
                          options={['<$1K', '$1K–10K', '$10K–50K', '$50K+']}
                          value={profile.availableCapital}
                          onChange={(v) => patch({ availableCapital: v })}
                        />
                        {showHints && !profile.availableCapital ? (
                          <p className="text-[11px] text-red-400/80">Pick one</p>
                        ) : null}
                      </div>
                    </>
                  )}
                  {profile.operatorType === 'investor' && (
                    <>
                      <div className="space-y-2">
                        <span className="text-[13px] text-white/50">What type?</span>
                        <PillRow
                          options={['Angel', 'VC', 'PE', 'Public markets', 'Crypto', 'Real estate']}
                          value={profile.investorType}
                          onChange={(v) => patch({ investorType: v })}
                        />
                        {showHints && !profile.investorType ? (
                          <p className="text-[11px] text-red-400/80">Pick one</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <span className="text-[13px] text-white/50">Check size</span>
                        <PillRow
                          options={['<$10K', '$10K–100K', '$100K–1M', '$1M+']}
                          value={profile.checkSize}
                          onChange={(v) => patch({ checkSize: v })}
                        />
                        {showHints && !profile.checkSize ? (
                          <p className="text-[11px] text-red-400/80">Pick one</p>
                        ) : null}
                      </div>
                      <label className="block space-y-2">
                        <span className="text-[13px] text-white/50">What are you evaluating?</span>
                        <textarea
                          rows={3}
                          placeholder="e.g. Series A SaaS deal in fintech"
                          className={fieldInputClass(showHints && !profile.currentEvaluation.trim())}
                          value={profile.currentEvaluation}
                          onChange={(e) => patch({ currentEvaluation: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                  {profile.operatorType === 'career' && (
                    <>
                      <label className="block space-y-2">
                        <span className="text-[13px] text-white/50">Current role</span>
                        <input
                          className={fieldInputClass(showHints && !profile.currentRole.trim())}
                          placeholder="e.g. Product Manager at Samsung"
                          value={profile.currentRole}
                          onChange={(e) => patch({ currentRole: e.target.value })}
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-[13px] text-white/50">What&apos;s the decision?</span>
                        <textarea
                          rows={3}
                          placeholder="e.g. Leave corporate to start a company"
                          className={fieldInputClass(showHints && !profile.decisionContext.trim())}
                          value={profile.decisionContext}
                          onChange={(e) => patch({ decisionContext: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!screen2Ok}
                onClick={() => {
                  setShowHints(true);
                  if (screen2Ok) setStep(3);
                }}
                className="rounded-xl bg-white/[0.08] px-5 py-2.5 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Continue →
              </button>
            </div>
            <p className="text-center text-[11px] text-white/30">🎁 Almost there — 1 more step for your token</p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" {...SCREEN_MOTION} className="space-y-6">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-[12px] text-white/40 hover:text-white/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <header className="space-y-1">
              <p className="text-[15px] font-medium text-white">How do you make decisions?</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white/35">Step 3 of 3</span>
                <StepDots active={3} />
              </div>
            </header>

            <SliderBlock
              label="Risk tolerance"
              left="Conservative"
              right="Bold"
              value={profile.riskTolerance}
              touched={!!profile._riskTouched}
              onChange={(v) => patch({ riskTolerance: v, _riskTouched: true })}
            />
            <SliderBlock
              label="Decision speed"
              left="Slow & careful"
              right="Fast & intuitive"
              value={profile.decisionSpeed}
              touched={!!profile._speedTouched}
              onChange={(v) => patch({ decisionSpeed: v, _speedTouched: true })}
            />

            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">What&apos;s your #1 goal right now?</span>
              <input
                className={fieldInputClass(showHints && !profile.goal.trim())}
                value={profile.goal}
                onChange={(e) => patch({ goal: e.target.value })}
                placeholder="Launch my cafe in Gangnam by September"
              />
            </label>

            <button
              type="button"
              disabled={!validation.complete || saving}
              onClick={() => void saveAndClaim()}
              style={{ backgroundColor: terracotta }}
              className="w-full rounded-xl py-3 text-[14px] font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving…' : '🎁 Claim your free token →'}
            </button>
            <p className="text-center text-[11px] text-white/30">{REWARD_TEASER}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepDots({ active }: { active: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn('h-2 w-2 rounded-full transition-colors', i <= active ? 'bg-[#e8593c]' : 'bg-white/15')}
        />
      ))}
    </div>
  );
}

function SliderBlock({
  label,
  left,
  right,
  value,
  touched,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  touched: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] text-white/50">{label}</label>
      <div className="flex items-center gap-3">
        <span className="w-[88px] text-right text-[11px] text-white/30">{left}</span>
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="h-2 flex-1 cursor-pointer accent-[#e8593c]"
        />
        <span className="w-[88px] text-[11px] text-white/30">{right}</span>
      </div>
      {!touched ? (
        <p className="text-[11px] text-white/20 animate-pulse">Drag to set your preference</p>
      ) : null}
    </div>
  );
}

function ClaimedEditor({
  profile,
  patch,
  saving,
  inlineError,
  onSave,
}: {
  profile: OperatorProfile;
  patch: (p: Partial<OperatorProfile>) => void;
  saving: boolean;
  inlineError: string | null;
  onSave: () => void;
}) {
  return (
    <div className="mx-auto max-w-[560px] space-y-8">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 sm:px-5">
        <p className="text-[14px] font-medium text-white/90">Profile complete · Reward claimed</p>
        <p className="mt-1 text-[13px] text-white/45">
          Edit your profile anytime — simulations will adapt to your updates.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-xl bg-white/[0.1] px-4 py-2 text-[13px] font-medium text-white/90 hover:bg-white/[0.14] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {inlineError ? <p className="text-sm text-red-400/90">{inlineError}</p> : null}

      <section className="space-y-4">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-white/35">You</h2>
        <label className="block space-y-2">
          <span className="text-[13px] text-white/50">Name</span>
          <input
            className={fieldInputClass()}
            value={profile.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-[13px] text-white/50">Location</span>
          <input
            className={fieldInputClass()}
            value={profile.location}
            onChange={(e) => patch({ location: e.target.value })}
          />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-white/35">Path</h2>
        <div className="grid grid-cols-2 gap-3">
          {TYPE_CARDS.map((c) => {
            const Icon = c.icon;
            const selected = profile.operatorType === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => patch({ operatorType: c.id, ...clearBranchFields() })}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all',
                  selected
                    ? 'border-[#e8593c]/45 bg-[#e8593c]/10'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15',
                )}
              >
                <Icon className="h-5 w-5 text-white/70" strokeWidth={1.5} />
                <span className="text-[13px] font-medium leading-snug text-white/90">
                  {c.title}
                  {c.subtitle ? (
                    <>
                      <br />
                      <span className="font-normal text-white/55">{c.subtitle}</span>
                    </>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        {profile.operatorType === 'business_owner' && (
          <div className="space-y-4 border-t border-white/[0.06] pt-4">
            <div className="space-y-2">
              <span className="text-[13px] text-white/50">Industry</span>
              <PillRow
                options={['Tech', 'F&B', 'Retail', 'Services', 'Manufacturing', 'Other']}
                value={profile.industry}
                onChange={(v) => patch({ industry: v })}
              />
            </div>
            <div className="space-y-2">
              <span className="text-[13px] text-white/50">Stage</span>
              <PillRow
                options={['Idea', 'Early', 'Growing', 'Established']}
                value={profile.businessStage}
                onChange={(v) => patch({ businessStage: v })}
              />
            </div>
            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">Focus</span>
              <textarea
                rows={3}
                className={fieldInputClass()}
                value={profile.currentFocus}
                onChange={(e) => patch({ currentFocus: e.target.value })}
              />
            </label>
          </div>
        )}
        {profile.operatorType === 'aspiring' && (
          <div className="space-y-4 border-t border-white/[0.06] pt-4">
            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">Idea</span>
              <textarea
                rows={3}
                className={fieldInputClass()}
                value={profile.businessIdea}
                onChange={(e) => patch({ businessIdea: e.target.value })}
              />
            </label>
            <div className="space-y-2">
              <span className="text-[13px] text-white/50">Progress</span>
              <PillRow
                options={['Just an idea', 'Researching', 'Building', 'Launched']}
                value={profile.stage}
                onChange={(v) => patch({ stage: v })}
              />
            </div>
            <div className="space-y-2">
              <span className="text-[13px] text-white/50">Capital</span>
              <PillRow
                options={['<$1K', '$1K–10K', '$10K–50K', '$50K+']}
                value={profile.availableCapital}
                onChange={(v) => patch({ availableCapital: v })}
              />
            </div>
          </div>
        )}
        {profile.operatorType === 'investor' && (
          <div className="space-y-4 border-t border-white/[0.06] pt-4">
            <div className="space-y-2">
              <span className="text-[13px] text-white/50">Type</span>
              <PillRow
                options={['Angel', 'VC', 'PE', 'Public markets', 'Crypto', 'Real estate']}
                value={profile.investorType}
                onChange={(v) => patch({ investorType: v })}
              />
            </div>
            <div className="space-y-2">
              <span className="text-[13px] text-white/50">Check size</span>
              <PillRow
                options={['<$10K', '$10K–100K', '$100K–1M', '$1M+']}
                value={profile.checkSize}
                onChange={(v) => patch({ checkSize: v })}
              />
            </div>
            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">Evaluating</span>
              <textarea
                rows={3}
                className={fieldInputClass()}
                value={profile.currentEvaluation}
                onChange={(e) => patch({ currentEvaluation: e.target.value })}
              />
            </label>
          </div>
        )}
        {profile.operatorType === 'career' && (
          <div className="space-y-4 border-t border-white/[0.06] pt-4">
            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">Role</span>
              <input
                className={fieldInputClass()}
                value={profile.currentRole}
                onChange={(e) => patch({ currentRole: e.target.value })}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-[13px] text-white/50">Decision</span>
              <textarea
                rows={3}
                className={fieldInputClass()}
                value={profile.decisionContext}
                onChange={(e) => patch({ decisionContext: e.target.value })}
              />
            </label>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-white/35">Style</h2>
        <SliderBlock
          label="Risk tolerance"
          left="Conservative"
          right="Bold"
          value={profile.riskTolerance}
          touched={!!profile._riskTouched}
          onChange={(v) => patch({ riskTolerance: v, _riskTouched: true })}
        />
        <SliderBlock
          label="Decision speed"
          left="Slow & careful"
          right="Fast & intuitive"
          value={profile.decisionSpeed}
          touched={!!profile._speedTouched}
          onChange={(v) => patch({ decisionSpeed: v, _speedTouched: true })}
        />
        <label className="block space-y-2">
          <span className="text-[13px] text-white/50">#1 goal</span>
          <input className={fieldInputClass()} value={profile.goal} onChange={(e) => patch({ goal: e.target.value })} />
        </label>
      </section>
    </div>
  );
}
