'use client';

import { cn } from '@/lib/design/cn';

export function SettingSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-base font-medium text-txt-primary">{title}</h2>
        {description && <p className="mt-1 text-sm text-txt-tertiary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SettingField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div>
        <label className="text-sm font-medium text-txt-secondary">{label}</label>
        {hint && <p className="text-xs text-txt-disabled">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-border-subtle', className)} role="separator" />;
}

export function SettingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-surface-2" />
        <div className="h-3 w-full max-w-md rounded bg-surface-2/80" />
      </div>
      <div className="h-10 w-full max-w-lg rounded-lg bg-surface-2" />
      <div className="h-24 w-full max-w-lg rounded-lg bg-surface-2/80" />
    </div>
  );
}
