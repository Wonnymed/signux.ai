"use client";

export function SignuxIcon({ color = "#D4AF37", size = 200, className = "" }: { color?: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M30 105 L30 90 L60 30 L90 30 L170 85 L170 105 L130 105 L90 75 L70 105Z" fill={color} />
      <path d="M170 95 L170 110 L140 170 L110 170 L30 115 L30 95 L70 95 L110 125 L130 95Z" fill={color} />
      <circle cx="100" cy="100" r="5.5" fill="none" stroke={color} strokeWidth="2.5" />
      <line x1="100" y1="88" x2="100" y2="78" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="111" y1="92" x2="118" y2="85" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="89" y1="92" x2="82" y2="85" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="111" y1="108" x2="118" y2="115" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="89" y1="108" x2="82" y2="115" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function SignuxLogo({
  iconColor = "#D4AF37",
  textColor = "var(--text-primary)",
  size = 48,
  showText = true,
  layout = "vertical",
}: {
  iconColor?: string;
  textColor?: string;
  size?: number;
  showText?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: layout === "vertical" ? "column" : "row",
      alignItems: "center",
      gap: layout === "vertical" ? 4 : 12,
    }}>
      <SignuxIcon color={iconColor} size={size} />
      {showText && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: size * 0.2,
            fontWeight: 700,
            letterSpacing: 5,
            color: textColor,
          }}>SIGNUX</span>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: size * 0.2,
            fontWeight: 300,
            letterSpacing: 3,
            color: textColor,
            opacity: 0.5,
          }}>AI</span>
        </div>
      )}
    </div>
  );
}
