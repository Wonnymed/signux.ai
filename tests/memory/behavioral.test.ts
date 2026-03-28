import { describe, it, expect, beforeEach } from 'vitest';
import { setMockData, clearMockData } from '../mocks/supabase';
import { TEST_USER_ID, createTestProfile } from '../helpers';

describe('Memory: Behavioral Profile', () => {
  beforeEach(() => {
    clearMockData();
  });

  // TEST 27: New user gets default profile (all 0.5)
  it('returns default profile for new user', async () => {
    setMockData('behavioral_profiles', []);

    const { getOrCreateProfile } = await import('@/lib/memory/behavioral');
    const profile = await getOrCreateProfile('brand-new-user');

    expect(profile.risk_tolerance).toBe(0.5);
    expect(profile.speed_preference).toBe(0.5);
    expect(profile.evidence_threshold).toBe(0.5);
    expect(profile.optimism_bias).toBe(0.5);
    expect(profile.detail_preference).toBe(0.5);
    expect(profile.confidence_calibration).toBe(0.5);
    expect(profile.inference_confidence).toBe(0.0);
  });

  // TEST 28: Behavioral context is empty when confidence too low
  it('returns empty context when inference confidence < 0.15', async () => {
    const { formatBehavioralContext } = await import('@/lib/memory/behavioral');

    const profile = createTestProfile({ inference_confidence: 0.1, risk_tolerance: 0.2 });
    const context = formatBehavioralContext(profile);

    expect(context).toBe('');
  });

  // TEST 29: Behavioral context includes risk-averse directive
  it('includes risk-averse directive for low risk tolerance', async () => {
    const { formatBehavioralContext } = await import('@/lib/memory/behavioral');

    const profile = createTestProfile({
      inference_confidence: 0.6,
      risk_tolerance: 0.2,
    });
    const context = formatBehavioralContext(profile);

    expect(context).toContain('RISK-AVERSE');
    expect(context).toContain('DECISION-MAKER PERSONALITY');
  });

  // TEST 30: applyBehavioralModifiers adjusts probability for overconfident system
  it('reduces probability when confidence_calibration < 0.4', async () => {
    const { applyBehavioralModifiers } = await import('@/lib/memory/behavioral');

    const profile = createTestProfile({
      inference_confidence: 0.6,
      confidence_calibration: 0.3,
    });

    const verdict = { recommendation: 'proceed', probability: 75 };
    const modified = applyBehavioralModifiers(profile, verdict);

    expect(modified.probability).toBeLessThan(75);
    expect(modified.calibration_adjusted).toBe(true);
  });
});
