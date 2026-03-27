/**
 * Maps each agent to the knowledge bases they should search.
 *
 * Investment agents → crypto-opsec, banking, V51-V55 (finance)
 * Business agents → V24-V50 (strategy, ops, marketing)
 * Relationship agents → V64 (consumer psychology), V79 (founder psychology)
 * etc.
 *
 * This ensures agents search RELEVANT knowledge, not the entire base.
 */

export type AgentKnowledgeSources = {
  categories: string[];    // knowledge_chunks.category values to search
  vSeries: string[];       // V-series to search
  maxChunks: number;       // max chunks to inject
};

// Default mapping — can be overridden per agent in DB
export const AGENT_KNOWLEDGE_MAP: Record<string, AgentKnowledgeSources> = {
  // ═══ INVESTMENT AGENTS ═══
  numbers_first: {
    categories: ['economics', 'forecasting', 'market-intel'],
    vSeries: ['V29', 'V47', 'V50', 'V51', 'V68'],
    maxChunks: 5,
  },
  chart_reader: {
    categories: ['market-intel', 'forecasting'],
    vSeries: ['V42', 'V51'],
    maxChunks: 4,
  },
  risk_destroyer: {
    categories: ['risk-intel', 'threat-models', 'scenario-packs'],
    vSeries: ['V24', 'V55', 'V59'],
    maxChunks: 5,
  },
  crowd_pulse: {
    categories: ['market-intel', 'game-theory'],
    vSeries: ['V64', 'V46'],
    maxChunks: 4,
  },
  big_picture: {
    categories: ['economics', 'geopolitics', 'forecasting'],
    vSeries: ['V42', 'V45', 'V71'],
    maxChunks: 5,
  },
  crypto_native: {
    categories: ['crypto-opsec', 'cybersecurity', 'mechanism-design'],
    vSeries: ['V52', 'V73'],
    maxChunks: 5,
  },
  income_builder: {
    categories: ['banking', 'economics'],
    vSeries: ['V50', 'V51', 'V52', 'V54'],
    maxChunks: 4,
  },
  portfolio_doctor: {
    categories: ['risk-intel', 'economics'],
    vSeries: ['V51', 'V55'],
    maxChunks: 4,
  },
  tax_smart: {
    categories: ['tax', 'legal', 'offshore'],
    vSeries: ['V52', 'V63'],
    maxChunks: 5,
  },
  honest_mirror: {
    categories: ['game-theory'],
    vSeries: ['V64', 'V79', 'V80'],
    maxChunks: 3,
  },

  // ═══ RELATIONSHIP AGENTS ═══
  pattern_detector: {
    categories: [],
    vSeries: ['V64', 'V79'],
    maxChunks: 3,
  },
  gut_check: {
    categories: [],
    vSeries: ['V64', 'V83'],
    maxChunks: 2,
  },
  attachment_decoder: {
    categories: [],
    vSeries: ['V64', 'V79'],
    maxChunks: 3,
  },
  red_flag_scanner: {
    categories: ['deception-intel'],
    vSeries: ['V24', 'V64'],
    maxChunks: 4,
  },
  money_and_love: {
    categories: ['banking'],
    vSeries: ['V29', 'V32', 'V52'],
    maxChunks: 4,
  },
  cultural_lens: {
    categories: [],
    vSeries: ['V71', 'V82'],
    maxChunks: 3,
  },

  // ═══ BUSINESS AGENTS ═══
  reality_check: {
    categories: ['market-intel', 'evaluation-lab'],
    vSeries: ['V27', 'V42', 'V65'],
    maxChunks: 5,
  },
  unit_economics_hawk: {
    categories: ['economics'],
    vSeries: ['V29', 'V47', 'V50', 'V51'],
    maxChunks: 5,
  },
  customer_whisperer: {
    categories: ['market-intel'],
    vSeries: ['V27', 'V64', 'V65', 'V66', 'V69', 'V70'],
    maxChunks: 5,
  },
  competitive_assassin: {
    categories: ['intelligence-systems', 'institutional-strategy'],
    vSeries: ['V26', 'V41', 'V44'],
    maxChunks: 5,
  },
  execution_realist: {
    categories: ['logistics'],
    vSeries: ['V31', 'V34', 'V56', 'V60'],
    maxChunks: 4,
  },
  regulatory_shield: {
    categories: ['legal', 'regulatory-compliance'],
    vSeries: ['V37', 'V63'],
    maxChunks: 5,
  },
  funding_strategist: {
    categories: ['banking'],
    vSeries: ['V32', 'V49', 'V54'],
    maxChunks: 5,
  },
  timing_oracle: {
    categories: ['forecasting', 'market-intel'],
    vSeries: ['V42', 'V45'],
    maxChunks: 4,
  },
  risk_scenario_builder: {
    categories: ['risk-intel', 'scenario-packs', 'threat-models'],
    vSeries: ['V24', 'V45', 'V59'],
    maxChunks: 5,
  },
  first_90_days: {
    categories: ['logistics'],
    vSeries: ['V28', 'V30', 'V31', 'V60'],
    maxChunks: 4,
  },

  // ═══ CAREER AGENTS ═══
  offer_decoder: {
    categories: [],
    vSeries: ['V29', 'V34', 'V80'],
    maxChunks: 4,
  },
  market_rate_check: {
    categories: [],
    vSeries: ['V29', 'V34', 'V85'],
    maxChunks: 4,
  },
  negotiation_coach: {
    categories: ['negotiation-warfare'],
    vSeries: ['V80', 'V83'],
    maxChunks: 5,
  },

  // ═══ LIFE AGENTS ═══
  values_compass: {
    categories: [],
    vSeries: ['V64', 'V79'],
    maxChunks: 3,
  },
  fear_separator: {
    categories: [],
    vSeries: ['V64', 'V79'],
    maxChunks: 3,
  },

  // ═══ HEALTH AGENTS ═══
  evidence_filter: {
    categories: ['evaluation-lab'],
    vSeries: ['V42', 'V65'],
    maxChunks: 5,
  },
  risk_benefit_calculator: {
    categories: ['risk-intel'],
    vSeries: ['V24', 'V59'],
    maxChunks: 4,
  },
  second_opinion_engine: {
    categories: [],
    vSeries: ['V64', 'V79'],
    maxChunks: 3,
  },
  mental_health_advocate: {
    categories: [],
    vSeries: ['V64', 'V79', 'V83'],
    maxChunks: 4,
  },
  long_game: {
    categories: [],
    vSeries: ['V42', 'V45'],
    maxChunks: 3,
  },
  habit_architect: {
    categories: [],
    vSeries: ['V64', 'V80'],
    maxChunks: 3,
  },
  energy_auditor: {
    categories: [],
    vSeries: ['V64', 'V79'],
    maxChunks: 3,
  },
  prevention_calculator: {
    categories: ['economics'],
    vSeries: ['V29', 'V47'],
    maxChunks: 4,
  },
  burnout_radar: {
    categories: ['risk-intel'],
    vSeries: ['V24', 'V64'],
    maxChunks: 4,
  },
  recovery_strategist: {
    categories: ['scenario-packs'],
    vSeries: ['V24', 'V59'],
    maxChunks: 4,
  },

  devils_advocate: {
    categories: ['game-theory'],
    vSeries: ['V64', 'V46'],
    maxChunks: 3,
  },
};

/**
 * Get knowledge sources for an agent.
 * Falls back to empty search if agent not mapped.
 */
export function getAgentKnowledgeSources(agentId: string): AgentKnowledgeSources {
  return AGENT_KNOWLEDGE_MAP[agentId] || { categories: [], vSeries: [], maxChunks: 3 };
}
