import ToolHeader from '@/components/tools/ToolHeader';
import RiskMatrixGrid from '@/components/tools/RiskMatrixGrid';
import { OCTUX_TOOLS } from '@/lib/tools/config';

const tool = OCTUX_TOOLS.find((t) => t.slug === 'risk-matrix')!;

export default function RiskMatrixPage() {
  return (
    <>
      <ToolHeader
        title={tool.name}
        description={tool.description}
        icon={tool.icon}
        iconColor={tool.color}
      />
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <RiskMatrixGrid />
      </div>
    </>
  );
}
