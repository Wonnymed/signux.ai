'use client';

import { cn } from '@/lib/design/cn';
import { OctAvatar, OctToggle } from '@/components/ui';

interface SelfAgentToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  userName?: string;
  userImage?: string;
  className?: string;
}

export default function SelfAgentToggle({
  enabled,
  onChange,
  userName = 'You',
  userImage,
  className,
}: SelfAgentToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors duration-normal',
        enabled
          ? 'border-accent/30 bg-accent-subtle/20'
          : 'border-border-subtle bg-surface-1',
        className,
      )}
    >
      <OctAvatar
        type="user"
        name={userName}
        imageUrl={userImage}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <OctToggle
          checked={enabled}
          onChange={onChange}
          label="Join as yourself"
          description="Add your own perspective to the debate"
          size="sm"
        />
      </div>
    </div>
  );
}
