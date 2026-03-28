import { jsPDF } from 'jspdf';

export type PdfSpecialistRow = { name: string; position: string; confidence: number };

export type SimulationPdfInput = {
  question: string;
  generatedAtLabel: string;
  verdict: Record<string, unknown>;
  specialists: PdfSpecialistRow[];
  godView?: {
    totalVoices: number;
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    isMarket: boolean;
  };
  specialistCount: number;
  roundCount: number;
};

function specialistsFromDebate(debate: unknown): PdfSpecialistRow[] {
  if (!debate || typeof debate !== 'object') return [];
  const out: PdfSpecialistRow[] = [];
  for (const reports of Object.values(debate as Record<string, unknown>)) {
    const arr = Array.isArray(reports) ? reports : [];
    const last = arr[arr.length - 1] as Record<string, unknown> | undefined;
    if (!last) continue;
    const name = String(last.agent_name || last.agent_id || 'Agent');
    const position = String(last.position || '—').toUpperCase();
    const confidence = typeof last.confidence === 'number' ? last.confidence : Number(last.confidence) || 0;
    out.push({ name, position, confidence });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function roundCountFromAudit(audit: unknown): number {
  const a = audit as { rounds?: unknown[] } | null;
  if (a?.rounds && Array.isArray(a.rounds)) return a.rounds.length;
  return 10;
}

/** Build PDF payload from a simulations table row (Supabase). */
export function buildPdfInputFromSimulationRow(row: {
  question: string;
  verdict: unknown;
  debate: unknown;
  audit?: unknown;
  created_at?: string;
}): SimulationPdfInput {
  const verdict = (row.verdict && typeof row.verdict === 'object' ? row.verdict : {}) as Record<string, unknown>;
  const specialists = specialistsFromDebate(row.debate);
  const gv = verdict.god_view as Record<string, unknown> | undefined;
  let godView: SimulationPdfInput['godView'];
  if (gv && typeof gv.totalVoices === 'number' && gv.totalVoices > 0) {
    const pos = Number(gv.positive) || 0;
    const neg = Number(gv.negative) || 0;
    const neu = Number(gv.neutral) || 0;
    const sum = pos + neg + neu || gv.totalVoices;
    godView = {
      totalVoices: gv.totalVoices,
      positivePct: Math.round((100 * pos) / sum),
      neutralPct: Math.round((100 * neu) / sum),
      negativePct: Math.round((100 * neg) / sum),
      isMarket: true,
    };
  }

  const created = row.created_at ? new Date(row.created_at) : new Date();
  const generatedAtLabel = created.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    question: String(row.question || ''),
    generatedAtLabel,
    verdict,
    specialists,
    godView,
    specialistCount: specialists.length || 10,
    roundCount: roundCountFromAudit(row.audit),
  };
}

function recLabel(v: Record<string, unknown>): string {
  const r = String(v.recommendation || '').toLowerCase();
  if (r.includes('proceed_with') || r.includes('conditions')) return 'PROCEED WITH CONDITIONS';
  if (r === 'delay') return 'DELAY';
  if (r === 'abandon') return 'ABANDON';
  return 'PROCEED';
}

export function generateSimulationPdf(input: SimulationPdfInput): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxW = pageW - 2 * margin;
  let y = margin;

  const addTitle = (text: string, size = 14) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      if (y > 720) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 1.35;
    }
  };

  const addBody = (text: string, size = 10) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(55, 55, 55);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      if (y > 720) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 1.35;
    }
  };

  const v = input.verdict;
  const prob = Math.min(100, Math.max(0, Math.round(Number(v.probability) || 0)));
  const grade = String(v.grade || '—');
  const summary = String(v.one_liner || v.leverage_point || v.main_risk || '');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(10, 10, 15);
  doc.text('OCTUX SIMULATION REPORT', margin, y);
  y += 28;
  addBody(`Generated: ${input.generatedAtLabel}`, 10);
  y += 6;

  addTitle('QUESTION', 11);
  addBody(`"${input.question}"`, 10);
  y += 8;

  addTitle('VERDICT', 11);
  doc.setFillColor(245, 245, 248);
  doc.roundedRect(margin, y, maxW, 52, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(232, 89, 60);
  doc.text(`${prob}%`, margin + 12, y + 34);
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(recLabel(v), margin + 72, y + 26);
  doc.text(grade, margin + 72, y + 42);
  y += 64;

  addTitle('SUMMARY', 11);
  addBody(summary || '—', 10);
  y += 6;

  addTitle('TOP RISK', 11);
  addBody(String(v.main_risk || '—'), 10);
  y += 6;
  addTitle('TOP ACTION', 11);
  addBody(String(v.next_action || '—'), 10);
  y += 10;

  addTitle('SPECIALIST POSITIONS', 11);
  for (const s of input.specialists.slice(0, 14)) {
    addBody(`${s.name}: ${s.position} (${Math.round(s.confidence)}/10)`, 9);
  }
  if (input.specialists.length === 0) {
    addBody('(No specialist breakdown stored for this simulation.)', 9);
  }
  y += 8;

  if (input.godView) {
    addTitle(
      `GOD'S VIEW (${input.godView.totalVoices} market voices)`,
      11,
    );
    addBody(
      `${input.godView.positivePct}% positive · ${input.godView.negativePct}% concerned · ${input.godView.neutralPct}% neutral`,
      10,
    );
    y += 8;
  }

  const cd = v.compare_data as Record<string, unknown> | undefined;
  if (cd && Array.isArray(cd.dimensions)) {
    addTitle('COMPARISON — DIMENSIONS', 11);
    addBody(`Winner: ${String(cd.winner_label || cd.winner || '')}`, 10);
    for (const d of cd.dimensions as Array<Record<string, unknown>>) {
      const line = `${d.name}: Option ${d.winner} — A ${d.score_a}/10 vs B ${d.score_b}/10`;
      addBody(line, 9);
      if (d.reasoning) addBody(`  ${String(d.reasoning).slice(0, 200)}`, 8);
    }
    y += 6;
  }

  const sd = v.stress_data as { risk_matrix?: Array<Record<string, unknown>> } | undefined;
  if (sd?.risk_matrix?.length) {
    addTitle('STRESS TEST — FAILURE VECTORS', 11);
    for (const row of sd.risk_matrix.slice(0, 10)) {
      const p = Number(row.probability) > 1 ? Number(row.probability) / 100 : Number(row.probability) || 0;
      addBody(
        `• ${String(row.threat)} [${String(row.impact)}] p≈${Math.round(p * 100)}% — ${String(row.mitigation || '')}`,
        8,
      );
    }
    y += 6;
  }

  const fa = v.failure_analysis as {
    failure_causes?: Array<{ cause: string; probability: number }>;
    prevention_checklist?: string[];
  } | undefined;
  if (fa?.failure_causes?.length) {
    addTitle('PRE-MORTEM — FAILURE CAUSES', 11);
    for (const c of fa.failure_causes.slice(0, 8)) {
      addBody(`• ${c.cause} (${Math.round((Number(c.probability) || 0) * 100)}%)`, 9);
    }
    if (fa.prevention_checklist?.length) {
      y += 4;
      addTitle('PREVENTION CHECKLIST', 11);
      for (const item of fa.prevention_checklist.slice(0, 12)) {
        addBody(`☐ ${item}`, 9);
      }
    }
    y += 6;
  }

  y += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + maxW, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const footer = `Generated by Octux AI · octux.ai\n${input.specialistCount} specialists · ${input.godView ? `${input.godView.totalVoices} market voices · ` : ''}${input.roundCount} rounds`;
  for (const line of footer.split('\n')) {
    doc.text(line, margin, y);
    y += 12;
  }

  return Buffer.from(doc.output('arraybuffer'));
}
