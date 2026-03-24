// TEST PHASE: All Haiku. Production: fast=Haiku, balanced=Sonnet, powerful=Opus
export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-haiku-4-5-20251001",     // PROD: claude-sonnet-4-20250514
  powerful: "claude-haiku-4-5-20251001",     // PROD: claude-opus-4-20250514
} as const;

export type TierModels = {
  chat: string;
  simulate_agents: string;
  simulate_report: string;
  research_plan: string;
  research_synthesis: string;
  enhance: string;
  title: string;
  reality_check: string;
  negotiate: string;
  build: string;
  hire: string;
  protect: string;
  grow: string;
  compete: string;
  gods_eye: string;
  threat_radar: string;
  deal_xray: string;
};

export function getModelsForTier(tier: string): TierModels {
  switch (tier) {
    case "free":
      return {
        chat: MODELS.fast,
        simulate_agents: MODELS.fast,
        simulate_report: MODELS.fast,
        research_plan: MODELS.fast,
        research_synthesis: MODELS.fast,
        enhance: MODELS.fast,
        title: MODELS.fast,
        reality_check: MODELS.fast,
        negotiate: MODELS.fast,
        build: MODELS.fast,
        hire: MODELS.fast,
        protect: MODELS.fast,
        grow: MODELS.fast,
        compete: MODELS.fast,
        gods_eye: MODELS.fast,
        threat_radar: MODELS.fast,
        deal_xray: MODELS.fast,
      };
    case "pro":
      return {
        chat: MODELS.balanced,
        simulate_agents: MODELS.balanced,
        simulate_report: MODELS.balanced,
        research_plan: MODELS.balanced,
        research_synthesis: MODELS.balanced,
        enhance: MODELS.fast,
        title: MODELS.fast,
        reality_check: MODELS.balanced,
        negotiate: MODELS.balanced,
        build: MODELS.balanced,
        hire: MODELS.balanced,
        protect: MODELS.balanced,
        grow: MODELS.balanced,
        compete: MODELS.balanced,
        gods_eye: MODELS.balanced,
        threat_radar: MODELS.balanced,
        deal_xray: MODELS.balanced,
      };
    case "max":
    case "founding":
      return {
        chat: MODELS.balanced,
        simulate_agents: MODELS.balanced,
        simulate_report: MODELS.powerful,
        research_plan: MODELS.balanced,
        research_synthesis: MODELS.powerful,
        enhance: MODELS.fast,
        title: MODELS.fast,
        reality_check: MODELS.balanced,
        negotiate: MODELS.balanced,
        build: MODELS.balanced,
        hire: MODELS.powerful,
        protect: MODELS.balanced,
        grow: MODELS.balanced,
        compete: MODELS.balanced,
        gods_eye: MODELS.powerful,
        threat_radar: MODELS.balanced,
        deal_xray: MODELS.powerful,
      };
    default:
      return getModelsForTier("free");
  }
}
