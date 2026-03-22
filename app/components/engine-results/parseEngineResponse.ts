import { cleanAgentResponse } from "../../lib/utils";
import type { EngineResponse } from "../../lib/types";

/**
 * Parses a raw engine response string into an EngineResponse object.
 * Tries JSON first, falls back to extracting a markdown-like structure.
 */
export function parseEngineResponse(raw: string): EngineResponse | null {
  if (!raw || typeof raw !== "string") return null;

  // 1. Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.engine) return parsed as EngineResponse;
  } catch {
    // not direct JSON
  }

  // 2. Clean markdown fences and try again
  const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === "object" && parsed.engine) return parsed as EngineResponse;
    } catch {
      // malformed JSON
    }
  }

  // 3. Fallback: use cleanAgentResponse and build a minimal EngineResponse
  const text = cleanAgentResponse(raw);
  if (!text) return null;

  return {
    engine: "unknown",
    title: "Analysis Result",
    executive_summary: text,
    confidence: "medium",
    status: "mixed",
    main_recommendation: "",
    key_risks: [],
    key_opportunities: [],
    next_actions: [],
    notes: [],
  };
}
