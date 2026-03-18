"use client";
import { useState, useEffect } from "react";

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      if (theme === "dark") return setDark(true);
      if (theme === "light") return setDark(false);
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    check();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", check);
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", check); obs.disconnect(); };
  }, []);
  return dark;
}

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

/**
 * [S-icon]IGNUX AI wordmark — icon replaces the letter S.
 * Automatically swaps to white icon + white text in dark mode.
 */
export function SignuxWordmark({
  fontSize = 40,
  iconSize,
  className = "",
  style,
}: {
  fontSize?: number;
  iconSize?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const dark = useIsDark();
  const iSize = iconSize ?? Math.round(fontSize * 1.1);
  const variant = dark ? "white" : "gold";
  const textColor = "var(--text-primary)";

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        ...style,
      }}
    >
      <img
        src={
          iSize <= 32
            ? `/icons/signux-icon-${variant}-32.png`
            : iSize <= 64
              ? `/icons/signux-icon-${variant}-64.png`
              : `/icons/signux-icon-${variant}.png`
        }
        alt=""
        width={iSize}
        height={iSize}
        draggable={false}
        style={{ objectFit: "contain", marginRight: Math.round(fontSize * -0.08), marginBottom: Math.round(fontSize * -0.08) }}
      />
      <span
        style={{
          fontFamily: "var(--font-brand)",
          fontSize,
          fontWeight: 700,
          letterSpacing: Math.max(3, Math.round(fontSize * 0.125)),
          color: textColor,
          lineHeight: 1,
        }}
      >
        IGNUX
      </span>
      <span
        style={{
          fontFamily: "var(--font-brand)",
          fontSize,
          fontWeight: 300,
          letterSpacing: Math.max(2, Math.round(fontSize * 0.09)),
          color: textColor,
          opacity: 0.35,
          lineHeight: 1,
          marginLeft: Math.round(fontSize * 0.25),
        }}
      >
        AI
      </span>
    </div>
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
