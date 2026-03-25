/**
 * LLM mock — returns predictable responses for tests.
 * Tests should set expected responses before calling functions.
 */

import { vi } from 'vitest';

let nextResponse = '{"result": "mock"}';
let callLog: { systemPrompt: string; userMessage: string; model?: string }[] = [];

export function setNextLLMResponse(response: string) {
  nextResponse = response;
}

export function setNextLLMResponseJSON(obj: any) {
  nextResponse = JSON.stringify(obj);
}

export function getLLMCallLog() {
  return callLog;
}

export function clearLLMCallLog() {
  callLog = [];
}

// Mock the claude module
vi.mock('@/lib/simulation/claude', () => ({
  callClaude: vi.fn(async (opts: any) => {
    callLog.push({
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      model: opts.model,
    });
    return nextResponse;
  }),
  callClaudeWithTools: vi.fn(async (opts: any) => {
    callLog.push({
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      model: opts.model,
    });
    return { text: nextResponse, citations: [] };
  }),
  parseJSON: vi.fn((text: string) => {
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }),
}));
