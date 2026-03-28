'use client';

import { useEffect, useState } from 'react';
import { SettingSection, SettingField, Divider, SettingSkeleton } from '../_components';
import { useAuth } from '@/components/auth/AuthProvider';

export default function SettingsProfilePage() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [decisionContext, setDecisionContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (cancelled) return;
        setFullName(data.fullName || '');
        setDisplayName(data.displayName || '');
        setEmail(data.email || '');
        setDecisionContext(data.decisionContext || '');
      } catch {
        if (!cancelled) setError('Could not load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function onSave() {
    if (!isAuthenticated) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, displayName, decisionContext }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-txt-tertiary">Sign in to edit your profile.</p>
    );
  }

  if (loading) {
    return <SettingSkeleton />;
  }

  return (
    <div className="mx-auto max-w-container-narrow space-y-10 pb-8">
      <SettingSection title="Profile" description="Your personal information.">
        <div className="grid gap-6 sm:grid-cols-2">
          <SettingField label="Full name">
            <input
              className="field-input w-full text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </SettingField>
          <SettingField label="Display name" hint="How Octux addresses you">
            <input
              className="field-input w-full text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          </SettingField>
        </div>
        <SettingField label="Email" hint="Contact support to change">
          <input
            className="field-input w-full cursor-not-allowed text-sm opacity-80"
            value={email}
            disabled
            readOnly
          />
        </SettingField>
      </SettingSection>

      <Divider />

      <SettingSection
        title="Decision context"
        description="Tell Octux about your situation so simulations are more personalized."
      >
        <textarea
          className="field-input min-h-[104px] w-full resize-y text-sm leading-relaxed"
          placeholder="I'm a 28-year-old entrepreneur in Seoul..."
          rows={4}
          value={decisionContext}
          onChange={(e) => setDecisionContext(e.target.value)}
        />
      </SettingSection>

      {error && (
        <div className="octx-banner-error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="octx-banner-success" role="status">
          Changes saved.
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-[8px] bg-[#e8593c] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
