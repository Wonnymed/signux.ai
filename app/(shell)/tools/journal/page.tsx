import ToolHeader from '@/components/tools/ToolHeader';
import DecisionJournal from '@/components/tools/DecisionJournal';
import { OCTUX_TOOLS } from '@/lib/tools/config';

const tool = OCTUX_TOOLS.find((t) => t.slug === 'journal')!;

export default function DecisionJournalPage() {
  return (
    <>
      <ToolHeader
        title={tool.name}
        description={`${tool.description} Searchable history — wire up your account later for live data.`}
        icon={tool.icon}
        iconColor={tool.color}
      />
      <div className="rounded-2xl border border-white/[0.06] bg-[#111118] p-6">
        <DecisionJournal />
      </div>
    </>
  );
}
