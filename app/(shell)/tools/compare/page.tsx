import ToolHeader from '@/components/tools/ToolHeader';
import ScenarioCompare from '@/components/tools/ScenarioCompare';
import { OCTUX_TOOLS } from '@/lib/tools/config';

const tool = OCTUX_TOOLS.find((t) => t.slug === 'compare')!;

export default function CompareScenariosPage() {
  return (
    <>
      <ToolHeader
        title={tool.name}
        description={tool.description}
        icon={tool.icon}
        iconColor={tool.color}
      />
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <ScenarioCompare />
      </div>
    </>
  );
}
