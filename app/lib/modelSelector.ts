import { MODELS } from "./models";

type Complexity = "simple" | "moderate" | "complex";

const SIMPLE_PATTERNS = [
  /^(hi|hello|hey|oi|ol[áa]|hola|ciao)\b/i,
  /^(thanks|thank you|obrigad[oa]|gracias|merci)\b/i,
  /^(yes|no|ok|sure|sim|n[ãa]o)\b/i,
  /^what (is|are) /i,
  /^(quem|quando|onde|quanto) /i,
  /^(define|explain) \w+$/i,
];

const COMPLEX_INDICATORS = [
  "simulate", "simulation", "analyze", "compare", "strategy",
  "should i", "what if", "pros and cons", "evaluate", "risk",
  "negotiate", "deal", "investment", "structure", "optimize",
  "war game", "threat", "scenario", "projection", "forecast",
  "devo", "deveria", "analise", "compare", "estratégia",
  "simulação", "risco", "investimento", "negociação",
];

export function detectComplexity(message: string): Complexity {
  const trimmed = message.trim();

  if (trimmed.length < 30) {
    for (const p of SIMPLE_PATTERNS) {
      if (p.test(trimmed)) return "simple";
    }
  }

  const lower = trimmed.toLowerCase();
  const wordCount = trimmed.split(/\s+/).length;

  if (wordCount > 40 || COMPLEX_INDICATORS.some(k => lower.includes(k))) {
    return "complex";
  }

  if (wordCount < 15 && trimmed.length < 80) {
    return "simple";
  }

  return "moderate";
}

export function getModelForComplexity(complexity: Complexity, tier: string): string {
  if (tier === "free") return MODELS.fast;

  switch (complexity) {
    case "simple":
      return MODELS.fast;
    case "moderate":
      return tier === "pro" ? MODELS.balanced : MODELS.balanced;
    case "complex":
      return tier === "pro" ? MODELS.balanced : MODELS.powerful;
  }
}
