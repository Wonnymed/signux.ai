'use client';

import { OctAvatar, OctBadge, OctToggle, OctTooltip } from '@/components/ui';
import { useTheme } from '@/lib/hooks/useTheme';

interface SidebarProfileProps {
  expanded: boolean;
  userName?: string;
  userImage?: string;
  tier?: 'free' | 'pro' | 'max' | 'kraken';
  onSettings?: () => void;
}

export default function SidebarProfile({ expanded, userName, userImage, tier = 'free', onSettings }: SidebarProfileProps) {
  const { isDark, toggleTheme } = useTheme();

  if (!expanded) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <OctTooltip content="Settings" placement="right">
          <button
            onClick={onSettings}
            className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="2.5" />
              <path d="M7 1v1.5M7 11.5V13M13 7h-1.5M2.5 7H1M11.2 2.8l-1.1 1.1M3.9 9.1l-1.1 1.1M11.2 11.2l-1.1-1.1M3.9 4.9L2.8 2.8" />
            </svg>
          </button>
        </OctTooltip>

        <OctTooltip content={isDark ? 'Light mode' : 'Dark mode'} placement="right">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
          >
            {isDark ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="3" />
                <path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.8 2.8l.7.7M10.5 10.5l.7.7M11.2 2.8l-.7.7M3.5 10.5l-.7.7" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8a5 5 0 01-6-6 5 5 0 106 6z" />
              </svg>
            )}
          </button>
        </OctTooltip>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-2.5">
        <OctAvatar type="user" name={userName} imageUrl={userImage} size="sm" />
        <div className="flex-1 min-w-0">
          <span className="text-xs text-txt-primary truncate block">{userName || 'User'}</span>
          <OctBadge tier={tier} size="xs">{tier.toUpperCase()}</OctBadge>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <OctTooltip content="Settings" placement="top">
            <button
              onClick={onSettings}
              className="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="2.5" />
                <path d="M7 1v1.5M7 11.5V13M13 7h-1.5M2.5 7H1M11.2 2.8l-1.1 1.1M3.9 9.1l-1.1 1.1M11.2 11.2l-1.1-1.1M3.9 4.9L2.8 2.8" />
              </svg>
            </button>
          </OctTooltip>
        </div>

        <OctToggle
          checked={isDark}
          onChange={toggleTheme}
          size="sm"
        />
      </div>
    </div>
  );
}
