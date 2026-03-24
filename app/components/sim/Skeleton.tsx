"use client";

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
};

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = "var(--radius-md)",
  style,
}: SkeletonProps) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width,
        height,
        borderRadius,
        background: "var(--surface-2)",
        ...style,
      }}
    />
  );
}

export function AgentCardSkeleton() {
  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        background: "var(--surface-raised)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Skeleton width={36} height={36} borderRadius="50%" />
        <Skeleton width={140} height={14} />
        <div style={{ flex: 1 }} />
        <Skeleton width={36} height={14} />
        <Skeleton width={72} height={22} borderRadius="var(--radius-full)" />
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <Skeleton width="100%" height={12} />
        <Skeleton width="75%" height={12} />
      </div>
    </div>
  );
}

export function VerdictSkeleton() {
  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderTop: "3px solid var(--surface-3)",
        borderRadius: "var(--radius-lg)",
        padding: 28,
        background: "var(--surface-raised)",
      }}
    >
      <Skeleton width={200} height={24} borderRadius="var(--radius-full)" />
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 24 }}>
        <Skeleton width={80} height={80} borderRadius="50%" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width={48} height={32} />
          <Skeleton width={100} height={12} />
        </div>
      </div>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Skeleton width={80} height={10} style={{ marginBottom: 6 }} />
          <Skeleton width="70%" height={14} />
        </div>
        <div>
          <Skeleton width={100} height={10} style={{ marginBottom: 6 }} />
          <Skeleton width="60%" height={14} />
        </div>
        <Skeleton width="100%" height={56} borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
}
