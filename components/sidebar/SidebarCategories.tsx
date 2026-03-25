'use client';

import { cn } from '@/lib/design/cn';
import { categoryColors } from '@/lib/design/tokens';

type CategoryFilter = 'all' | 'investment' | 'relationships' | 'career' | 'business' | 'life';

interface SidebarCategoriesProps {
  active: CategoryFilter;
  onChange: (cat: CategoryFilter) => void;
  counts?: Record<string, number>;
  className?: string;
}

const categories: { id: CategoryFilter; label: string; color?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'investment', label: 'Invest', color: categoryColors.investment },
  { id: 'career', label: 'Career', color: categoryColors.career },
  { id: 'business', label: 'Biz', color: categoryColors.business },
  { id: 'relationships', label: 'Love', color: categoryColors.relationships },
  { id: 'life', label: 'Life', color: categoryColors.life },
];

export default function SidebarCategories({ active, onChange, counts, className }: SidebarCategoriesProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto scrollbar-hide py-1', className)}>
      {categories.map(cat => {
        const isActive = active === cat.id;
        const count = cat.id === 'all' ? undefined : counts?.[cat.id];

        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={cn(
              'shrink-0 px-2 py-0.5 rounded-sm text-micro font-medium transition-all duration-normal',
              isActive
                ? 'bg-surface-2 text-txt-primary'
                : 'text-txt-disabled hover:text-txt-tertiary',
            )}
          >
            {cat.color && (
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: cat.color }} />
            )}
            {cat.label}
            {count !== undefined && count > 0 && (
              <span className="ml-0.5 text-[9px] text-txt-disabled">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
