'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/design/cn';

type Score = 'strong' | 'partial' | 'weak';

const ROWS = [
  {
    feature: 'Estrutura de analise',
    chatgpt: 'Resposta unica',
    consultants: 'Revisao manual',
    octux: 'Simulacao multi-perspectiva',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Tempo para saida util',
    chatgpt: 'Segundos, sem estrutura',
    consultants: 'Dias a semanas',
    octux: 'Abaixo de 1 minuto',
    chatgptScore: 'partial' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Risco explicito',
    chatgpt: 'Depende de prompt',
    consultants: 'Projeto a projeto',
    octux: 'Downside scan nativo',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Comparar opcoes rapido',
    chatgpt: 'Parcial',
    consultants: 'Lento',
    octux: 'Sim',
    chatgptScore: 'partial' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Probabilidade e confianca',
    chatgpt: 'Raro',
    consultants: 'Nem sempre',
    octux: 'Em todo veredito',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Rastreabilidade',
    chatgpt: 'Sem trilha clara',
    consultants: 'Depende do time',
    octux: 'Claim ligado ao agente',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Discordancia explicita',
    chatgpt: 'Normalmente nao',
    consultants: 'Variavel',
    octux: 'Adversarial por design',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'partial' as Score,
    octuxScore: 'strong' as Score,
  },
  {
    feature: 'Infra de decisao no tempo',
    chatgpt: 'Nao',
    consultants: 'Raro',
    octux: 'Projetado para isso',
    chatgptScore: 'weak' as Score,
    consultantsScore: 'weak' as Score,
    octuxScore: 'strong' as Score,
  },
];

export default function WhyNotChatGPT() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1020px]">

        {/* ─── HEADER ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-center sm:mb-12"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-accent">
            Why Octux
          </p>
          <h2 className="mb-3 text-2xl font-medium tracking-tight text-txt-primary sm:text-3xl">
            Not another chatbot. A decision engine.
          </h2>
          <p className="mx-auto max-w-reading text-sm leading-relaxed text-txt-tertiary sm:text-base">
            Octux foi desenhado para estruturar decisoes, pressionar incerteza e retornar saida acionavel.
          </p>
        </motion.div>

        {/* Desktop compact table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mx-auto mb-1 hidden max-w-[940px] grid-cols-[1.2fr_0.95fr_0.95fr_0.95fr] gap-0 lg:grid"
        >
          <div />
          <ColumnHeader label="General chatbot" sublabel="Single response" />
          <ColumnHeader label="Traditional advisory" sublabel="Manual review" />
          <ColumnHeader label="Octux" sublabel="Decision OS" highlighted />
        </motion.div>

        <div className="mx-auto hidden max-w-[940px] overflow-hidden rounded-radius-xl border border-border-subtle/70 bg-surface-0 lg:block">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, y: 6 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.2 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'grid grid-cols-[1.2fr_0.95fr_0.95fr_0.95fr] gap-0',
                i > 0 && 'border-t border-border-subtle/60',
              )}
            >
              <div className="flex items-start px-4 py-3.5">
                <span className="text-[13px] font-medium leading-snug text-txt-primary">
                  {row.feature}
                </span>
              </div>
              <ComparisonCell text={row.chatgpt} score={row.chatgptScore} />
              <ComparisonCell text={row.consultants} score={row.consultantsScore} />
              <ComparisonCell text={row.octux} score={row.octuxScore} winner />
            </motion.div>
          ))}
        </div>

        {/* Mobile compact cards */}
        <div className="space-y-4 lg:hidden">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.04 }}
              className="overflow-hidden rounded-radius-lg border border-border-subtle"
            >
              <div className="border-b border-border-subtle/60 px-4 py-3">
                <span className="text-sm font-medium text-txt-primary">{row.feature}</span>
              </div>
              <div className="divide-y divide-border-subtle/40">
                <MobileRow label="General chatbot" text={row.chatgpt} score={row.chatgptScore} />
                <MobileRow label="Traditional advisory" text={row.consultants} score={row.consultantsScore} />
                <MobileRow label="Octux" text={row.octux} score={row.octuxScore} winner />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 text-center"
        >
          <p className="text-xs italic text-txt-disabled">
            Tabela ilustrativa para posicionamento de produto.
          </p>
          <p className="mt-3 text-sm text-txt-secondary sm:text-base">
            Built for decisions that need more than one answer.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ═══ COLUMN HEADER ═══

function ColumnHeader({
  label, sublabel, highlighted = false,
}: {
  label: string; sublabel: string; highlighted?: boolean;
}) {
  return (
    <div className={cn(
      'px-4 py-3 text-center',
      highlighted && 'rounded-t-radius-xl border-x border-t border-accent/25 bg-gradient-to-b from-accent-subtle to-accent-subtle/35 shadow-accent-ring',
    )}>
      <span className={cn(
        'block text-[13px] font-semibold',
        highlighted ? 'text-accent' : 'text-txt-disabled',
      )}>
        {label}
      </span>
      <span className="mt-0.5 block text-[10px] text-txt-disabled">{sublabel}</span>
    </div>
  );
}

// ═══ COMPARISON CELL ═══

function ComparisonCell({
  text, score, winner = false,
}: {
  text: string; score: Score; winner?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-start gap-2 border-l px-4 py-3.5',
      winner ? 'border-accent/25 bg-gradient-to-b from-accent-subtle/75 to-accent-subtle/15 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.08)]' : 'border-border-subtle/40',
    )}>
      <ScoreDot score={score} />
      <span className={cn(
        'text-[12px] leading-relaxed',
        winner ? 'text-txt-primary' :
        score === 'strong' ? 'text-txt-secondary' :
        score === 'partial' ? 'text-txt-tertiary' : 'text-txt-disabled',
      )}>
        {text}
      </span>
    </div>
  );
}

// ═══ SCORE DOT — 6px. Bloomberg uses dots. So do we. ═══

function ScoreDot({ score }: { score: Score }) {
  return (
    <span className={cn(
      'mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full',
      score === 'strong' && 'bg-verdict-proceed',
      score === 'partial' && 'bg-verdict-delay',
      score === 'weak' && 'bg-verdict-abandon/60',
    )} />
  );
}

// ═══ MOBILE ROW ═══

function MobileRow({
  label, text, score, winner = false,
}: {
  label: string; text: string; score: Score; winner?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3',
      winner && 'bg-accent-subtle',
    )}>
      <ScoreDot score={score} />
      <div className="min-w-0 flex-1">
        <span className={cn(
          'mb-0.5 block text-[10px] font-medium uppercase tracking-wider',
          winner ? 'text-accent' : 'text-txt-disabled',
        )}>
          {label}
        </span>
        <span className={cn(
          'block text-[13px] leading-relaxed',
          winner ? 'text-txt-primary' :
          score === 'strong' ? 'text-txt-secondary' :
          score === 'partial' ? 'text-txt-tertiary' : 'text-txt-disabled',
        )}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ═══ OUTCOME VERDICT CARDS (landing — not simulation VerdictCard) ═══

