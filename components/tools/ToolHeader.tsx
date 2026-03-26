import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/design/cn';

interface ToolHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export default function ToolHeader({
  title,
  description,
  icon: Icon,
  iconColor = '#7C3AED',
  className,
}: ToolHeaderProps) {
  return (
    <header className={cn('mb-8', className)}>
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${iconColor}18` }}
        >
          <Icon size={24} style={{ color: iconColor }} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-medium text-white/90 tracking-tight leading-snug pt-1">
          {title}
        </h1>
      </div>
      <p className="text-sm text-white/50 max-w-xl leading-relaxed">{description}</p>
    </header>
  );
}
