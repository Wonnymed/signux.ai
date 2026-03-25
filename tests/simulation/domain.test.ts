import { describe, it, expect, beforeEach } from 'vitest';
import { clearLLMCallLog, setNextLLMResponseJSON } from '../mocks/llm';

describe('Simulation: Domain Detection', () => {
  beforeEach(() => {
    clearLLMCallLog();
  });

  // TEST 11: Investment keywords → investment domain
  it('detects investment domain from keywords', async () => {
    const { detectDomain } = await import('@/lib/simulation/domain');
    const result = await detectDomain('Should I invest in NVIDIA stock?');

    expect(result.domain).toBe('investment');
    expect(result.disclaimer_required).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  // TEST 12: Business domain via LLM fallback (no business keyword list exists)
  it('detects business domain via LLM classification', async () => {
    setNextLLMResponseJSON({ domain: 'business', subdomain: 'F&B', confidence: 0.85 });

    const { detectDomain } = await import('@/lib/simulation/domain');
    const result = await detectDomain('Should I open a café in Gangnam?');

    expect(result.domain).toBe('business');
    expect(result.disclaimer_required).toBe(false);
  });

  // TEST 13: Health keywords → health domain with disclaimer
  it('detects health domain with disclaimer required', async () => {
    const { detectDomain } = await import('@/lib/simulation/domain');
    const result = await detectDomain('Should I get knee surgery or try physical therapy?');

    expect(result.domain).toBe('health');
    expect(result.disclaimer_required).toBe(true);
  });

  // TEST 14: Legal keywords → legal domain with disclaimer
  it('detects legal domain with disclaimer required', async () => {
    const { detectDomain } = await import('@/lib/simulation/domain');
    const result = await detectDomain('Should I sue my landlord for breach of contract?');

    expect(result.domain).toBe('legal');
    expect(result.disclaimer_required).toBe(true);
  });

  // TEST 15: Disclaimer text exists for regulated domains
  it('returns disclaimer text for investment domain', async () => {
    const { getDisclaimer } = await import('@/lib/simulation/domain');

    const investDisclaimer = getDisclaimer('investment');
    const businessDisclaimer = getDisclaimer('business');

    expect(investDisclaimer).toContain('not financial advice');
    expect(businessDisclaimer).toBe('');
  });

  // TEST 16: Domain constraints are non-empty for all domains
  it('formatDomainConstraints returns non-empty for all known domains', async () => {
    const { formatDomainConstraints } = await import('@/lib/simulation/domain');

    const domains = ['business', 'investment', 'career', 'health', 'legal', 'technology'];

    for (const domain of domains) {
      const formatted = formatDomainConstraints({
        domain: domain as any,
        confidence: 0.8,
        subdomain: domain,
        disclaimer_required: false,
        agent_constraints: [`Test constraint for ${domain}`],
      });
      expect(formatted.length).toBeGreaterThan(0);
    }
  });
});
