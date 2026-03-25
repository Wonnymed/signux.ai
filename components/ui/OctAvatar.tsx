import { cn } from '@/lib/design/cn';
import { getAgentColor, type CategoryType } from '@/lib/design/tokens';
import { type ReactNode } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarType = 'agent' | 'user' | 'entity' | 'system';

interface OctAvatarProps {
  type?: AvatarType;
  size?: AvatarSize;
  category?: CategoryType;
  agentIndex?: number;
  agentIcon?: ReactNode;
  name?: string;
  imageUrl?: string;
  state?: 'dormant' | 'active' | 'engaged' | 'maximum';
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  xs: { container: 'w-5 h-5', text: 'text-[9px]', icon: '[&>svg]:w-2.5 [&>svg]:h-2.5' },
  sm: { container: 'w-7 h-7', text: 'text-micro', icon: '[&>svg]:w-3 [&>svg]:h-3' },
  md: { container: 'w-8 h-8', text: 'text-xs', icon: '[&>svg]:w-3.5 [&>svg]:h-3.5' },
  lg: { container: 'w-10 h-10', text: 'text-sm', icon: '[&>svg]:w-4 [&>svg]:h-4' },
  xl: { container: 'w-14 h-14', text: 'text-base', icon: '[&>svg]:w-5 [&>svg]:h-5' },
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function OctAvatar({ type = 'agent', size = 'md', category = 'life', agentIndex = 0, agentIcon, name, imageUrl, state = 'dormant', className }: OctAvatarProps) {
  const s = sizeStyles[size];

  if (type === 'agent') {
    const color = getAgentColor(category, agentIndex);
    return (
      <div className={cn('rounded-full flex items-center justify-center shrink-0 font-medium text-white', s.container, s.icon, className)}
        style={{ backgroundColor: color }} title={name}>
        {agentIcon || (name ? <span className={s.text}>{getInitials(name)}</span> : null)}
      </div>
    );
  }

  if (type === 'user') {
    if (imageUrl) return <img src={imageUrl} alt={name || 'User'} className={cn('rounded-full object-cover shrink-0', s.container, className)} />;
    return (
      <div className={cn('rounded-full flex items-center justify-center shrink-0 font-medium bg-accent-muted text-accent', s.container, s.text, className)}>
        {name ? getInitials(name) : '?'}
      </div>
    );
  }

  if (type === 'entity') {
    const glowClass: Record<string, string> = {
      dormant: 'entity-ring', active: 'entity-ring-active animate-breathe-fast',
      engaged: 'entity-ring-engaged animate-breathe-fast', maximum: 'entity-ring-engaged animate-pulse-entity',
    };
    return (
      <div className={cn('rounded-full flex items-center justify-center shrink-0',
        'bg-gradient-to-br from-accent to-entity-bioluminescent', s.container,
        glowClass[state], state === 'dormant' && 'animate-breathe', className,
      )}>
        <span className={s.text}>🐙</span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center shrink-0 bg-surface-2 text-icon-secondary', s.container, s.icon, className)}>
      <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" /></svg>
    </div>
  );
}
