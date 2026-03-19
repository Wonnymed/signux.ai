export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-20250514",
  powerful: "claude-opus-4-20250514",
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
  launchpad: string;
  invest: string;
  globalops: string;
  gods_eye: string;
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
        launchpad: MODELS.fast,
        invest: MODELS.fast,
        globalops: MODELS.fast,
        gods_eye: MODELS.fast,
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
        launchpad: MODELS.balanced,
        invest: MODELS.balanced,
        globalops: MODELS.balanced,
        gods_eye: MODELS.balanced,
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
        launchpad: MODELS.balanced,
        invest: MODELS.powerful,
        globalops: MODELS.balanced,
        gods_eye: MODELS.powerful,
      };
    default:
      return getModelsForTier("free");
  }
}
