// ── Semantic Kernel #19 — Plugin Architecture ──────────────
// Modular filter pipeline for input validation, output quality,
// and agent response guardrails (OpenAI Agents SDK #8 pattern)

import type { AgentReport, DecisionObject } from '../agents/types';

// ── Types ──────────────────────────────────────────────────

export type SimulationConfig = {
  maxRounds: number;
  maxTokensPerAgent: number;
  timeoutMs: number;
  minAgentsForVerdict: number;
  convergenceThreshold: number; // 0-1: how much agreement to require
};

export type InputFilter = {
  name: string;
  run: (question: string) => { pass: boolean; reason?: string };
};

export type OutputFilter = {
  name: string;
  run: (verdict: DecisionObject) => { pass: boolean; patched?: DecisionObject; reason?: string };
};

export type AgentFilter = {
  name: string;
  run: (report: AgentReport) => { pass: boolean; patched?: AgentReport; reason?: string };
};

export type OctuxKernel = {
  config: SimulationConfig;
  inputFilters: InputFilter[];
  outputFilters: OutputFilter[];
  agentFilters: AgentFilter[];
};

// ── Factory ────────────────────────────────────────────────

const DEFAULT_CONFIG: SimulationConfig = {
  maxRounds: 10,
  maxTokensPerAgent: 1024,
  timeoutMs: 60_000,
  minAgentsForVerdict: 3,
  convergenceThreshold: 0.6,
};

export function createKernel(overrides?: Partial<SimulationConfig>): OctuxKernel {
  return {
    config: { ...DEFAULT_CONFIG, ...overrides },
    inputFilters: [contentGuardrail, lengthGuardrail],
    outputFilters: [verdictCoherenceFilter],
    agentFilters: [agentResponseFilter],
  };
}

// ── Built-in Input Filters (OpenAI Agents SDK #8 guardrails) ──

const contentGuardrail: InputFilter = {
  name: 'content_guardrail',
  run: (question) => {
    const blocked = /\b(hack|exploit|illegal|weapon|bomb)\b/i;
    if (blocked.test(question)) {
      return { pass: false, reason: 'Question contains blocked content' };
    }
    return { pass: true };
  },
};

const lengthGuardrail: InputFilter = {
  name: 'length_guardrail',
  run: (question) => {
    if (question.length < 10) {
      return { pass: false, reason: 'Question too short — provide more context' };
    }
    if (question.length > 2000) {
      return { pass: false, reason: 'Question too long — keep under 2000 characters' };
    }
    return { pass: true };
  },
};

// ── Built-in Output Filter ─────────────────────────────────

const verdictCoherenceFilter: OutputFilter = {
  name: 'verdict_coherence',
  run: (verdict) => {
    // Ensure probability is within bounds
    let patched = { ...verdict };
    let needsPatch = false;

    if (patched.probability < 0 || patched.probability > 100) {
      patched.probability = Math.max(0, Math.min(100, patched.probability));
      needsPatch = true;
    }

    if (patched.grade_score < 0 || patched.grade_score > 100) {
      patched.grade_score = Math.max(0, Math.min(100, patched.grade_score));
      needsPatch = true;
    }

    // Ensure recommendation matches probability range
    if (patched.probability >= 75 && patched.recommendation === 'abandon') {
      patched.recommendation = 'proceed_with_conditions';
      needsPatch = true;
    }
    if (patched.probability <= 25 && patched.recommendation === 'proceed') {
      patched.recommendation = 'delay';
      needsPatch = true;
    }

    return needsPatch
      ? { pass: true, patched, reason: 'Verdict patched for coherence' }
      : { pass: true };
  },
};

// ── Built-in Agent Filter ──────────────────────────────────

const agentResponseFilter: AgentFilter = {
  name: 'agent_response_quality',
  run: (report) => {
    let patched = { ...report };
    let needsPatch = false;

    // Clamp confidence to 1-10
    if (patched.confidence < 1 || patched.confidence > 10) {
      patched.confidence = Math.max(1, Math.min(10, patched.confidence));
      needsPatch = true;
    }

    // Ensure position is valid
    if (!['proceed', 'delay', 'abandon'].includes(patched.position)) {
      patched.position = 'delay';
      needsPatch = true;
    }

    // Ensure key_argument isn't empty
    if (!patched.key_argument || patched.key_argument.trim().length === 0) {
      return { pass: false, reason: 'Agent returned empty key_argument' };
    }

    return needsPatch
      ? { pass: true, patched, reason: 'Agent report patched for quality' }
      : { pass: true };
  },
};
