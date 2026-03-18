"use client";

export function SignuxIcon({
  variant = "gold",
  size = 32,
  className = "",
  onClick,
  style,
}: {
  variant?: "gold" | "black" | "white";
  size?: number;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const src =
    size <= 32
      ? `/icons/signux-icon-${variant}-32.png`
      : size <= 64
        ? `/icons/signux-icon-${variant}-64.png`
        : `/icons/signux-icon-${variant}.png`;
  return (
    <img
      src={src}
      alt="SIGNUX AI"
      width={size}
      height={size}
      className={className}
      onClick={onClick}
      draggable={false}
      style={{
        objectFit: "contain",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    />
  );
}

export function SignuxLogo({
  variant = "gold",
  textColor = "var(--text-primary)",
  size = 48,
  showText = true,
  layout = "vertical",
}: {
  variant?: "gold" | "black" | "white";
  textColor?: string;
  size?: number;
  showText?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: layout === "vertical" ? "column" : "row",
        alignItems: "center",
        gap: layout === "vertical" ? 4 : 12,
      }}
    >
      <SignuxIcon variant={variant} size={size} />
      {showText && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: size * 0.2,
              fontWeight: 700,
              letterSpacing: 5,
              color: textColor,
            }}
          >
            SIGNUX
          </span>
          <span
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: size * 0.2,
              fontWeight: 300,
              letterSpacing: 3,
              color: textColor,
              opacity: 0.5,
            }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}
