// SukgoLogo.tsx — Drop this into your components folder
// Usage: <SukgoLogo variant="dark" size="md" showWordmark />
// Font: Add to your layout.tsx or _app.tsx:
//   import { Sora } from 'next/font/google'
//   const sora = Sora({ subsets: ['latin'], weight: ['400'] })

import React from 'react';

interface SukgoLogoProps {
  variant?: 'dark' | 'light';  // dark = white mark on dark bg, light = dark mark on light bg
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, font: 16, gap: 8 },
  md: { icon: 32, font: 20, gap: 10 },
  lg: { icon: 40, font: 26, gap: 14 },
  xl: { icon: 48, font: 32, gap: 16 },
};

const PrismIcon = ({ size, variant }: { size: number; variant: 'dark' | 'light' }) => {
  const bg = variant === 'dark' ? '#fafafa' : '#09090b';
  const fg = variant === 'dark' ? '#09090b' : '#fafafa';

  return (
    <svg width={size} height={size} viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="52" rx="13" fill={bg} />
      <circle cx="26" cy="9" r="3.5" fill={fg} />
      {/* Top fan — diverging */}
      <line x1="26" y1="12.5" x2="10" y2="26" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.22" />
      <line x1="26" y1="12.5" x2="15" y2="26" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      <line x1="26" y1="12.5" x2="20.5" y2="26" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.56" />
      <line x1="26" y1="12.5" x2="26" y2="26" stroke={fg} strokeWidth="2.6" strokeLinecap="round" opacity="0.82" />
      <line x1="26" y1="12.5" x2="31.5" y2="26" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.56" />
      <line x1="26" y1="12.5" x2="37" y2="26" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      <line x1="26" y1="12.5" x2="42" y2="26" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.22" />
      {/* Bottom fan — converging */}
      <line x1="10" y1="26" x2="26" y2="39.5" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.22" />
      <line x1="15" y1="26" x2="26" y2="39.5" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      <line x1="20.5" y1="26" x2="26" y2="39.5" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.56" />
      <line x1="26" y1="26" x2="26" y2="39.5" stroke={fg} strokeWidth="2.6" strokeLinecap="round" opacity="0.82" />
      <line x1="31.5" y1="26" x2="26" y2="39.5" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.56" />
      <line x1="37" y1="26" x2="26" y2="39.5" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      <line x1="42" y1="26" x2="26" y2="39.5" stroke={fg} strokeWidth="2.2" strokeLinecap="round" opacity="0.22" />
      <circle cx="26" cy="43" r="3.5" fill={fg} />
    </svg>
  );
};

export default function SukgoLogo({
  variant = 'dark',
  size = 'md',
  showWordmark = true,
  className = '',
}: SukgoLogoProps) {
  const s = sizes[size];
  const textColor = variant === 'dark' ? '#fafafa' : '#09090b';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: s.gap,
      }}
    >
      <PrismIcon size={s.icon} variant={variant} />
      {showWordmark && (
        <span
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 400,
            fontSize: s.font,
            letterSpacing: '-0.03em',
            color: textColor,
            lineHeight: 1,
          }}
        >
          sukgo
        </span>
      )}
    </div>
  );
}
