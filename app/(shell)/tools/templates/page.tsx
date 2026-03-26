import ToolHeader from '@/components/tools/ToolHeader';
import TemplateCards from '@/components/tools/TemplateCards';
import { OCTUX_TOOLS } from '@/lib/tools/config';

const tool = OCTUX_TOOLS.find((t) => t.slug === 'templates')!;

export default function DecisionTemplatesPage() {
  return (
    <>
      <ToolHeader
        title={tool.name}
        description={tool.description}
        icon={tool.icon}
        iconColor={tool.color}
      />
      <div className="rounded-2xl border border-white/[0.06] bg-[#111118] p-6">
        <TemplateCards />
      </div>
    </>
  );
}
