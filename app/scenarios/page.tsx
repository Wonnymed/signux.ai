"use client";
import { useState, useMemo } from "react";
import {
  ArrowLeft, Search, Zap, Hammer, TrendingUp, UserCheck, Shield, Swords,
  ArrowRight, Star, Sparkles,
} from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";
import { ENGINES, SIGNUX_GOLD, type EngineId } from "../lib/engines";

/* ═══ Icon map ═══ */
const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Hammer, TrendingUp, UserCheck, Shield, Swords,
};

/* ═══ Scenario data ═══ */
type Scenario = {
  id: string;
  engine: EngineId;
  question: string;
  context: string;
  tags?: string[];
  featured?: boolean;
};

const SCENARIOS: Scenario[] = [
  // ═══ FEATURED ═══
  {
    id: "f1", engine: "simulate", featured: true,
    question: "Should I launch a premium coffee brand in Gangnam with a limited initial budget?",
    context: "Test whether a premium positioning can work in a saturated market with constrained capital.",
    tags: ["launch", "market entry"],
  },
  {
    id: "f2", engine: "hire", featured: true,
    question: "Should I hire a VP Sales now or wait until revenue is more stable?",
    context: "Timing a senior hire when cash is limited but pipeline needs leadership.",
    tags: ["timing", "leadership"],
  },
  {
    id: "f3", engine: "grow", featured: true,
    question: "Should I prioritize creator partnerships or performance ads for the next 90 days?",
    context: "Decide the highest-leverage growth channel before committing budget.",
    tags: ["channels", "budget allocation"],
  },
  {
    id: "f4", engine: "compete", featured: true,
    question: "How would a well-funded incumbent likely respond if we enter their core market?",
    context: "Anticipate competitive reaction before making an irreversible market move.",
    tags: ["competitive response", "market entry"],
  },
  {
    id: "f5", engine: "protect", featured: true,
    question: "What could break this product launch before it becomes expensive to fix?",
    context: "Surface hidden risks in execution, regulation, or market timing.",
    tags: ["risk", "pre-launch"],
  },
  {
    id: "f6", engine: "build", featured: true,
    question: "How do I go from validated idea to first paying customers in 60 days?",
    context: "Build the fastest path from proof-of-concept to revenue with limited resources.",
    tags: ["execution", "speed"],
  },

  // ═══ SIMULATE ═══
  {
    id: "s1", engine: "simulate",
    question: "Should I raise a bridge round or push to profitability with current runway?",
    context: "Evaluate dilution risk vs. operational constraint at a critical growth stage.",
    tags: ["fundraising", "capital"],
  },
  {
    id: "s2", engine: "simulate",
    question: "Should I pivot from B2C to B2B while we still have 8 months of runway?",
    context: "Test whether a business model shift is viable given time and resource constraints.",
    tags: ["pivot", "business model"],
  },
  {
    id: "s3", engine: "simulate",
    question: "Should I expand to Brazil first or consolidate in Korea before going international?",
    context: "Compare international timing against domestic market depth.",
    tags: ["expansion", "international"],
  },
  {
    id: "s4", engine: "simulate",
    question: "Is it the right moment to acquire a struggling competitor at a discount?",
    context: "Evaluate whether an opportunistic acquisition creates more leverage or more risk.",
    tags: ["M&A", "opportunistic"],
  },
  {
    id: "s5", engine: "simulate",
    question: "Should I sign an exclusive distribution deal or keep optionality?",
    context: "Test whether exclusivity accelerates growth or limits future strategic options.",
    tags: ["partnerships", "optionality"],
  },

  // ═══ BUILD ═══
  {
    id: "b1", engine: "build",
    question: "How do I structure the first 90 days after closing a seed round?",
    context: "Sequence hiring, product, and GTM to maximize signal before the next milestone.",
    tags: ["post-raise", "execution"],
  },
  {
    id: "b2", engine: "build",
    question: "What is the fastest path to launching an MVP for a marketplace product?",
    context: "Identify the minimum scope that proves the supply-demand loop works.",
    tags: ["MVP", "marketplace"],
  },
  {
    id: "b3", engine: "build",
    question: "How should I sequence building a sales team from zero to five reps?",
    context: "Determine the hiring order, tooling, and enablement needed to ramp a team.",
    tags: ["sales", "team building"],
  },
  {
    id: "b4", engine: "build",
    question: "What does a realistic product roadmap look like for the next two quarters?",
    context: "Balance feature velocity, tech debt, and user feedback into an executable plan.",
    tags: ["roadmap", "planning"],
  },
  {
    id: "b5", engine: "build",
    question: "How do I set up operations for a cross-border e-commerce launch?",
    context: "Map logistics, compliance, payments, and fulfillment for a new market.",
    tags: ["operations", "cross-border"],
  },

  // ═══ GROW ═══
  {
    id: "g1", engine: "grow",
    question: "Where is the biggest revenue bottleneck in my current funnel?",
    context: "Diagnose whether the constraint is acquisition, activation, or monetization.",
    tags: ["funnel", "diagnostics"],
  },
  {
    id: "g2", engine: "grow",
    question: "Should I raise prices or increase volume to hit next quarter's target?",
    context: "Evaluate pricing power vs. market sensitivity at the current growth stage.",
    tags: ["pricing", "revenue"],
  },
  {
    id: "g3", engine: "grow",
    question: "What growth experiments should I prioritize with a $20K monthly budget?",
    context: "Rank the highest-leverage experiments given budget and team constraints.",
    tags: ["experiments", "budget"],
  },
  {
    id: "g4", engine: "grow",
    question: "How do I reduce churn from 8% to under 4% in the next two quarters?",
    context: "Identify the root causes of churn and the highest-impact retention levers.",
    tags: ["retention", "churn"],
  },
  {
    id: "g5", engine: "grow",
    question: "Is now the right time to launch a referral program or double down on paid?",
    context: "Compare organic virality potential against paid acquisition efficiency.",
    tags: ["referral", "acquisition"],
  },

  // ═══ HIRE ═══
  {
    id: "h1", engine: "hire",
    question: "Should I hire a CTO or a strong senior engineer as my first technical hire?",
    context: "Determine the right seniority level for a non-technical founder's first technical team member.",
    tags: ["first hire", "technical"],
  },
  {
    id: "h2", engine: "hire",
    question: "Is this candidate strong enough to lead our go-to-market as Head of Growth?",
    context: "Evaluate candidate fit against the specific growth challenges of the business.",
    tags: ["candidate evaluation", "leadership"],
  },
  {
    id: "h3", engine: "hire",
    question: "Should I hire in-house or outsource design for the next product phase?",
    context: "Compare cost, quality, and speed tradeoffs for creative execution.",
    tags: ["build vs buy", "design"],
  },
  {
    id: "h4", engine: "hire",
    question: "What should the interview process look like for our first account executive?",
    context: "Design a hiring process that tests for the right skills at the current stage.",
    tags: ["process", "sales hiring"],
  },
  {
    id: "h5", engine: "hire",
    question: "When does it make sense to hire a CFO vs. using a fractional finance lead?",
    context: "Evaluate whether full-time finance leadership is justified at the current scale.",
    tags: ["timing", "finance"],
  },

  // ═══ PROTECT ═══
  {
    id: "p1", engine: "protect",
    question: "What are the top three existential risks to this business in the next 12 months?",
    context: "Surface the threats that could kill the company before they become obvious.",
    tags: ["threat scan", "existential"],
  },
  {
    id: "p2", engine: "protect",
    question: "What happens to our business if our biggest customer churns?",
    context: "Stress-test revenue concentration and identify mitigation paths.",
    tags: ["concentration risk", "revenue"],
  },
  {
    id: "p3", engine: "protect",
    question: "Are we exposed to any regulatory risk we haven't addressed yet?",
    context: "Scan for compliance gaps before they become expensive legal problems.",
    tags: ["compliance", "regulatory"],
  },
  {
    id: "p4", engine: "protect",
    question: "What would happen if our supply chain partner fails to deliver for two weeks?",
    context: "Model operational fragility and identify backup options.",
    tags: ["supply chain", "fragility"],
  },
  {
    id: "p5", engine: "protect",
    question: "How vulnerable is our IP if a competitor reverse-engineers our approach?",
    context: "Evaluate defensibility and identify areas that need stronger moats.",
    tags: ["IP", "defensibility"],
  },

  // ═══ COMPETE ═══
  {
    id: "c1", engine: "compete",
    question: "Where is the biggest gap in our main competitor's product that we can exploit?",
    context: "Find the positioning wedge that creates differentiation in a crowded market.",
    tags: ["positioning", "gaps"],
  },
  {
    id: "c2", engine: "compete",
    question: "What would happen if our competitor cuts prices by 30% next quarter?",
    context: "Simulate a price war scenario and evaluate our response options.",
    tags: ["pricing war", "response"],
  },
  {
    id: "c3", engine: "compete",
    question: "Who is most likely to enter our market in the next 18 months?",
    context: "Identify potential new entrants and prepare defensive positions.",
    tags: ["new entrants", "anticipation"],
  },
  {
    id: "c4", engine: "compete",
    question: "Should I compete on features, price, or distribution in this market?",
    context: "Determine the strongest competitive axis given current strengths and constraints.",
    tags: ["strategy", "positioning"],
  },
  {
    id: "c5", engine: "compete",
    question: "How should I position against a competitor that just raised $50M?",
    context: "Develop an asymmetric strategy when outspent by a well-funded rival.",
    tags: ["asymmetric", "fundraising"],
  },
];

const ENGINE_ORDER: EngineId[] = ["simulate", "build", "grow", "hire", "protect", "compete"];

export default function ScenarioGallery() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [engineFilter, setEngineFilter] = useState<EngineId | null>(null);

  /* ═══ Filter logic ═══ */
  const filtered = useMemo(() => {
    let list = SCENARIOS;
    if (engineFilter) {
      list = list.filter(s => s.engine === engineFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.question.toLowerCase().includes(q) ||
        s.context.toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, engineFilter]);

  const featured = useMemo(() => {
    if (engineFilter || search.trim()) return [];
    return SCENARIOS.filter(s => s.featured);
  }, [engineFilter, search]);

  const byEngine = useMemo(() => {
    const map: Partial<Record<EngineId, Scenario[]>> = {};
    const nonFeatured = filtered.filter(s => !s.featured || engineFilter || search.trim());
    for (const s of nonFeatured) {
      if (!map[s.engine]) map[s.engine] = [];
      map[s.engine]!.push(s);
    }
    return map;
  }, [filtered, engineFilter, search]);

  function handleUse(scenario: Scenario) {
    const engineMode = scenario.engine;
    const q = encodeURIComponent(scenario.question);
    window.location.href = `/chat?mode=${engineMode}&q=${q}`;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary, #FFFFFF)",
      color: "var(--text-primary, #111111)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 920,
        margin: "0 auto",
        padding: isMobile ? "24px 16px 64px" : "40px 32px 80px",
      }}>

        {/* ═══ Back link ═══ */}
        <a
          href="/chat"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            color: "var(--text-tertiary, #9CA3AF)", fontSize: 12,
            textDecoration: "none", marginBottom: 20, transition: "color 180ms ease-out",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary, #5B5B5B)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary, #9CA3AF)"}
        >
          <ArrowLeft size={13} strokeWidth={1.5} /> Back to Signux
        </a>

        {/* ═══ Header ═══ */}
        <div style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 12 : 0,
          marginBottom: 28,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${SIGNUX_GOLD}10`, border: `1px solid ${SIGNUX_GOLD}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={16} strokeWidth={1.5} style={{ color: SIGNUX_GOLD }} />
              </div>
              <h1 style={{
                fontSize: isMobile ? 20 : 22, fontWeight: 500,
                color: "var(--text-primary)", margin: 0, letterSpacing: 0.2,
              }}>Scenario Gallery</h1>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary, #5B5B5B)", margin: 0, lineHeight: 1.5 }}>
              Start from real decision scenarios across the six Signux engines.
            </p>
          </div>
        </div>

        {/* ═══ Search + engine filter ═══ */}
        <div style={{
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 10,
          marginBottom: 28,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 14px", borderRadius: 10, flex: 1,
            border: "1px solid var(--border-primary, #E8E8E3)",
            background: "var(--bg-secondary, #FAFAF7)",
          }}>
            <Search size={15} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search scenarios..."
              style={{
                flex: 1, border: "none", background: "transparent",
                color: "var(--text-primary)", fontSize: 13.5, outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <FilterChip label="All" active={!engineFilter} onClick={() => setEngineFilter(null)} />
            {ENGINE_ORDER.map(id => (
              <FilterChip
                key={id}
                label={ENGINES[id].name}
                active={engineFilter === id}
                color={ENGINES[id].color}
                onClick={() => setEngineFilter(engineFilter === id ? null : id)}
              />
            ))}
          </div>
        </div>

        {/* ═══ No results ═══ */}
        {filtered.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "56px 24px", textAlign: "center",
          }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              No matching scenarios
            </span>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 320, lineHeight: 1.5, marginBottom: 16 }}>
              Try a different keyword or clear filters.
            </span>
            <button
              onClick={() => { setSearch(""); setEngineFilter(null); }}
              style={{
                padding: "8px 18px", borderRadius: 8,
                background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
              }}
            >Clear filters</button>
          </div>
        )}

        {/* ═══ ZONE B: Featured ═══ */}
        {featured.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Star size={13} strokeWidth={1.5} style={{ color: SIGNUX_GOLD }} />
              <h2 style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 1.6,
                textTransform: "uppercase", color: SIGNUX_GOLD, margin: 0,
              }}>Featured scenarios</h2>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12,
            }}>
              {featured.map(s => (
                <ScenarioCard key={s.id} scenario={s} onUse={handleUse} featured isMobile={isMobile} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ ZONE C: By engine ═══ */}
        {ENGINE_ORDER.map(engineId => {
          const items = byEngine[engineId];
          if (!items || items.length === 0) return null;
          const engineData = ENGINES[engineId];
          const Icon = ICON_MAP[engineData.icon] || Zap;

          return (
            <div key={engineId} style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Icon size={14} strokeWidth={1.5} style={{ color: engineData.color }} />
                <h2 style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 1.6,
                  textTransform: "uppercase", color: engineData.color, margin: 0,
                }}>{engineData.name}</h2>
                <span style={{
                  fontSize: 10, color: "var(--text-tertiary)", marginLeft: 4,
                }}>{engineData.subtitle}</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
              }}>
                {items.map(s => (
                  <ScenarioCard key={s.id} scenario={s} onUse={handleUse} isMobile={isMobile} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ Scenario card ═══ */
function ScenarioCard({
  scenario,
  onUse,
  featured,
  isMobile,
}: {
  scenario: Scenario;
  onUse: (s: Scenario) => void;
  featured?: boolean;
  isMobile: boolean;
}) {
  const engineData = ENGINES[scenario.engine];
  const color = engineData.color;

  return (
    <button
      onClick={() => onUse(scenario)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: featured ? (isMobile ? 18 : 20) : 16,
        borderRadius: 14,
        border: `1px solid ${featured ? `${color}30` : "var(--border-primary, #E8E8E3)"}`,
        background: featured ? `${color}05` : "var(--bg-secondary, #FAFAF7)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "border-color 200ms ease-out, background 200ms ease-out",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}50`;
        e.currentTarget.style.background = `${color}08`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = featured ? `${color}30` : "var(--border-primary, #E8E8E3)";
        e.currentTarget.style.background = featured ? `${color}05` : "var(--bg-secondary, #FAFAF7)";
      }}
    >
      {/* Engine chip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
          padding: "2px 7px", borderRadius: 4,
          background: `${color}12`, color,
        }}>
          {engineData.name}
        </span>
        {scenario.tags && scenario.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4 }}>
            {scenario.tags.slice(0, 2).map(t => (
              <span key={t} style={{
                fontSize: 9, fontWeight: 500, padding: "1px 6px", borderRadius: 3,
                background: "var(--bg-primary, #FFFFFF)",
                border: "1px solid var(--border-secondary, #F0F0EB)",
                color: "var(--text-tertiary, #9CA3AF)",
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Question */}
      <span style={{
        fontSize: featured ? 14.5 : 13.5,
        fontWeight: 500,
        color: "var(--text-primary, #111111)",
        lineHeight: 1.45,
      }}>
        {scenario.question}
      </span>

      {/* Context */}
      <span style={{
        fontSize: 12,
        color: "var(--text-tertiary, #9CA3AF)",
        lineHeight: 1.5,
      }}>
        {scenario.context}
      </span>

      {/* CTA */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        fontSize: 11.5, fontWeight: 500, color,
        marginTop: 2,
      }}>
        Open in {engineData.name} <ArrowRight size={11} strokeWidth={2} />
      </div>
    </button>
  );
}

/* ═══ Filter chip ═══ */
function FilterChip({ label, active, color, onClick }: {
  label: string; active: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, fontWeight: 500, padding: "5px 10px", borderRadius: 6,
        border: `1px solid ${active ? (color || SIGNUX_GOLD) + "40" : "var(--border-primary, #E8E8E3)"}`,
        background: active ? (color || SIGNUX_GOLD) + "10" : "transparent",
        color: active ? (color || SIGNUX_GOLD) : "var(--text-tertiary, #9CA3AF)",
        cursor: "pointer", transition: "all 180ms ease-out",
      }}
    >{label}</button>
  );
}
