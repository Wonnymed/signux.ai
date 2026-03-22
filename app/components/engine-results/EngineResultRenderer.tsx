"use client";
import React from "react";
import type { EngineResponse } from "../../lib/types";
import StatusBadge from "./StatusBadge";
import MetricCard from "./MetricCard";
import RiskCard from "./RiskCard";
import ActionList from "./ActionList";
import InsightCard from "./InsightCard";
import ScoreGauge from "./ScoreGauge";

interface EngineResultRendererProps {
  response: EngineResponse;
}

/* ─── shared header ─── */
function Header({ response }: { response: EngineResponse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      {response.title && (
        <h2 style={{ fontSize: 22, fontWeight: 400, color: "var(--text-primary)", margin: 0 }}>
          {response.title}
        </h2>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <StatusBadge value={response.confidence} type="confidence" />
        <StatusBadge value={response.status} type="status" />
      </div>
    </div>
  );
}

/* ─── shared executive summary ─── */
function Summary({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        borderRadius: 10,
        padding: "16px 20px",
        marginBottom: 20,
      }}
    >
      <span style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{text}</span>
    </div>
  );
}

/* ─── shared recommendation ─── */
function Recommendation({ text }: { text: string }) {
  if (!text) return null;
  return (
    <InsightCard title="Main Recommendation" content={text} type="action" />
  );
}

/* ─── shared risks / opportunities ─── */
function RisksAndOpportunities({ risks, opportunities }: { risks?: string[]; opportunities?: string[] }) {
  const hasRisks = risks && risks.length > 0;
  const hasOpps = opportunities && opportunities.length > 0;
  if (!hasRisks && !hasOpps) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: hasRisks && hasOpps ? "1fr 1fr" : "1fr",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {hasRisks && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={sectionLabel}>Key Risks</span>
          {risks!.map((r, i) => (
            <InsightCard key={i} title={`Risk ${i + 1}`} content={r} type="risk" />
          ))}
        </div>
      )}
      {hasOpps && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={sectionLabel}>Key Opportunities</span>
          {opportunities!.map((o, i) => (
            <InsightCard key={i} title={`Opportunity ${i + 1}`} content={o} type="opportunity" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── shared footer ─── */
function Footer({ response }: { response: EngineResponse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {response.next_actions?.length > 0 && (
        <ActionList actions={response.next_actions} title="Next Actions" />
      )}
      {response.notes?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={sectionLabel}>Notes</span>
          {response.notes.map((n: string, i: number) => (
            <InsightCard key={i} title="Note" content={n} type="info" />
          ))}
        </div>
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  marginBottom: 4,
};

/* ════════════════════════════════════════
   ENGINE-SPECIFIC LAYOUTS
   ════════════════════════════════════════ */

function BuildLayout({ r }: { r: EngineResponse }) {
  return (
    <>
      {r.current_stage && (
        <div style={{ marginBottom: 20 }}>
          <StatusBadge value={r.current_stage} type="status" />
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <Recommendation text={r.main_recommendation} />
      </div>
      {r.main_bottleneck && (
        <div style={{ marginBottom: 20 }}>
          <InsightCard
            title="Main Bottleneck"
            content={typeof r.main_bottleneck === "string" ? r.main_bottleneck : r.main_bottleneck.description || JSON.stringify(r.main_bottleneck)}
            type="risk"
          />
        </div>
      )}
      {r.roadmap?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Roadmap</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {r.roadmap.map((step: any, i: number) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                    {step.phase || `Phase ${i + 1}`}
                  </span>
                  {step.timeline && (
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {step.timeline}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {step.action || step.description || step.goal || JSON.stringify(step)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {(r.first_30_days || r.first_90_days) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {r.first_30_days && (
            <MetricCard label="First 30 Days" value={r.first_30_days.focus || "—"} sublabel={r.first_30_days.key_milestone} />
          )}
          {r.first_90_days && (
            <MetricCard label="First 90 Days" value={r.first_90_days.focus || "—"} sublabel={r.first_90_days.key_milestone} />
          )}
        </div>
      )}
      <RisksAndOpportunities risks={r.key_risks} opportunities={r.key_opportunities} />
    </>
  );
}

function GrowLayout({ r }: { r: EngineResponse }) {
  return (
    <>
      {r.highest_leverage_move && (
        <div style={{ marginBottom: 20 }}>
          <InsightCard
            title="Highest Leverage Move"
            content={typeof r.highest_leverage_move === "string" ? r.highest_leverage_move : r.highest_leverage_move.description || r.highest_leverage_move.move || JSON.stringify(r.highest_leverage_move)}
            type="action"
          />
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <Recommendation text={r.main_recommendation} />
      </div>
      {r.growth_levers?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Growth Levers</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            {r.growth_levers.map((lever: any, i: number) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {lever.lever || lever.name}
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {lever.impact && <StatusBadge value={lever.impact} type="status" />}
                  {lever.difficulty && (
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px",
                      borderRadius: 100, color: "var(--text-tertiary)", border: "1px solid var(--border-primary)",
                    }}>
                      {lever.difficulty} effort
                    </span>
                  )}
                </div>
                {lever.description && (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {lever.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {r.channel_priorities?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <ActionList
            actions={r.channel_priorities.map((c: any) =>
              typeof c === "string" ? c : `${c.channel || c.name}: ${c.rationale || c.reason || ""}`
            )}
            title="Channel Priorities"
          />
        </div>
      )}
      {r.experiments?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Recommended Experiments</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {r.experiments.map((exp: any, i: number) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {exp.experiment || exp.name}
                </span>
                {exp.hypothesis && (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    Hypothesis: {exp.hypothesis}
                  </span>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {exp.timeline && (
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                      {exp.timeline}
                    </span>
                  )}
                  {exp.metric && (
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                      Metric: {exp.metric}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <RisksAndOpportunities risks={r.key_risks} opportunities={r.key_opportunities} />
    </>
  );
}

function HireLayout({ r }: { r: EngineResponse }) {
  return (
    <>
      {r.recommendation && (
        <div style={{ marginBottom: 20 }}>
          <StatusBadge value={r.recommendation} type="recommendation" />
        </div>
      )}
      {r.scores && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {r.scores.candidate_fit != null && <ScoreGauge score={r.scores.candidate_fit} label="Candidate Fit" />}
          {r.scores.timing != null && <ScoreGauge score={r.scores.timing} label="Timing" />}
          {r.scores.role_clarity != null && <ScoreGauge score={r.scores.role_clarity} label="Role Clarity" />}
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <Recommendation text={r.main_recommendation} />
      </div>
      {r.red_flags?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Red Flags</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {r.red_flags.map((flag: any, i: number) => (
              <InsightCard
                key={i}
                title={flag.severity || "Flag"}
                content={typeof flag === "string" ? flag : flag.flag || flag.description || JSON.stringify(flag)}
                type="risk"
              />
            ))}
          </div>
        </div>
      )}
      {r.strengths?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Strengths</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {r.strengths.map((s: any, i: number) => (
              <InsightCard
                key={i}
                title="Strength"
                content={typeof s === "string" ? s : s.strength || s.description || JSON.stringify(s)}
                type="opportunity"
              />
            ))}
          </div>
        </div>
      )}
      {r.interview_focus_points?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <ActionList
            actions={r.interview_focus_points.map((p: any) =>
              typeof p === "string" ? p : `${p.area || p.topic}: ${p.question || p.sample_question || ""}`
            )}
            title="Interview Focus Points"
          />
        </div>
      )}
      <RisksAndOpportunities risks={r.key_risks} opportunities={r.key_opportunities} />
    </>
  );
}

function ProtectLayout({ r }: { r: EngineResponse }) {
  return (
    <>
      {r.fragility_level && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={sectionLabel}>Fragility</span>
          <StatusBadge value={r.fragility_level} type="status" />
          {r.fragility_rationale && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.fragility_rationale}</span>
          )}
        </div>
      )}
      {r.top_threat && (
        <div style={{ marginBottom: 20 }}>
          <InsightCard
            title={`Top Threat: ${r.top_threat.name || ""}`}
            content={r.top_threat.description || ""}
            type="risk"
          />
          {r.top_threat.mitigation && (
            <div style={{ marginTop: 8 }}>
              <InsightCard title="Mitigation" content={r.top_threat.mitigation} type="action" />
            </div>
          )}
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <Recommendation text={r.main_recommendation} />
      </div>
      {r.risk_matrix?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Risk Matrix</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            {r.risk_matrix.map((risk: any, i: number) => (
              <RiskCard
                key={i}
                risk={risk.name || risk.risk}
                likelihood={risk.likelihood}
                impact={risk.impact}
                mitigation={risk.mitigation}
              />
            ))}
          </div>
        </div>
      )}
      {r.compliance_exposure?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Compliance Exposure</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {r.compliance_exposure.map((c: any, i: number) => (
              <InsightCard
                key={i}
                title={c.area || "Compliance"}
                content={`${c.exposure || ""}${c.action ? ` — ${c.action}` : ""}`}
                type="risk"
              />
            ))}
          </div>
        </div>
      )}
      {r.operational_fragilities?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Operational Fragilities</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {r.operational_fragilities.map((f: any, i: number) => (
              <InsightCard
                key={i}
                title={f.fragility || "Fragility"}
                content={`${f.consequence || ""}${f.fix ? ` — Fix: ${f.fix}` : ""}`}
                type="risk"
              />
            ))}
          </div>
        </div>
      )}
      <RisksAndOpportunities risks={r.key_risks} opportunities={r.key_opportunities} />
    </>
  );
}

function CompeteLayout({ r }: { r: EngineResponse }) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Recommendation text={r.main_recommendation} />
      </div>
      {r.competitive_set?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Competitive Set</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            {r.competitive_set.map((comp: any, i: number) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                    {comp.name}
                  </span>
                  {comp.threat_level && <StatusBadge value={comp.threat_level} type="status" />}
                </div>
                {comp.positioning && (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {comp.positioning}
                  </span>
                )}
                {comp.market_share_estimate && (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                    Market share: {comp.market_share_estimate}
                  </span>
                )}
                <div style={{ display: "flex", gap: 12 }}>
                  {comp.strengths?.length > 0 && (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--positive)", letterSpacing: 0.5 }}>
                        STRENGTHS
                      </span>
                      {comp.strengths.map((s: string, j: number) => (
                        <div key={j} style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                  {comp.weaknesses?.length > 0 && (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--negative)", letterSpacing: 0.5 }}>
                        WEAKNESSES
                      </span>
                      {comp.weaknesses.map((w: string, j: number) => (
                        <div key={j} style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {r.likely_response && (
        <div style={{ marginBottom: 20 }}>
          <InsightCard
            title={`Likely Response: ${r.likely_response.competitor || ""}`}
            content={`${r.likely_response.scenario || ""}${r.likely_response.your_counter ? ` — Counter: ${r.likely_response.your_counter}` : ""}`}
            type="risk"
          />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {r.weakest_flank && (
          <InsightCard
            title="Weakest Flank"
            content={`${r.weakest_flank.area}: ${r.weakest_flank.why || ""}${r.weakest_flank.mitigation ? ` — ${r.weakest_flank.mitigation}` : ""}`}
            type="risk"
          />
        )}
        {r.strongest_advantage && (
          <InsightCard
            title="Strongest Advantage"
            content={`${r.strongest_advantage.area}: ${r.strongest_advantage.why || ""}${r.strongest_advantage.how_to_leverage ? ` — ${r.strongest_advantage.how_to_leverage}` : ""}`}
            type="opportunity"
          />
        )}
      </div>
      {r.market_gaps?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={sectionLabel}>Market Gaps</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {r.market_gaps.map((gap: any, i: number) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                    {gap.gap}
                  </span>
                  {gap.opportunity_size && <StatusBadge value={gap.opportunity_size} type="status" />}
                </div>
                {gap.why_unfilled && (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{gap.why_unfilled}</span>
                )}
                {gap.how_to_capture && (
                  <span style={{ fontSize: 12, color: "var(--accent)" }}>{gap.how_to_capture}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {r.counter_moves?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <ActionList
            actions={r.counter_moves.map((m: any) =>
              typeof m === "string" ? m : `${m.move}${m.target ? ` (vs ${m.target})` : ""}${m.expected_impact ? ` — ${m.expected_impact}` : ""}`
            )}
            title="Counter-Moves"
          />
        </div>
      )}
      <RisksAndOpportunities risks={r.key_risks} opportunities={r.key_opportunities} />
    </>
  );
}

/* ─── fallback for unknown engines ─── */
function GenericLayout({ r }: { r: EngineResponse }) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Recommendation text={r.main_recommendation} />
      </div>
      <RisksAndOpportunities risks={r.key_risks} opportunities={r.key_opportunities} />
    </>
  );
}

/* ════════════════════════════════════════
   MASTER RENDERER
   ════════════════════════════════════════ */

export default function EngineResultRenderer({ response }: EngineResultRendererProps) {
  if (!response) return null;

  const LayoutMap: Record<string, React.FC<{ r: EngineResponse }>> = {
    build: BuildLayout,
    grow: GrowLayout,
    hire: HireLayout,
    protect: ProtectLayout,
    compete: CompeteLayout,
  };

  const Layout = LayoutMap[response.engine] || GenericLayout;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <Header response={response} />
      <Summary text={response.executive_summary} />
      <Layout r={response} />
      <Footer response={response} />
    </div>
  );
}
