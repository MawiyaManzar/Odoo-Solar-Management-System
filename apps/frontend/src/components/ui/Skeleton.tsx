import React from "react";

/** Flat loading block. No gradient. */
export const Skeleton: React.FC<{ width?: string; height?: number }> = ({ width = "100%", height = 14 }) => (
  <span
    aria-hidden="true"
    style={{
      display: "block",
      width,
      height,
      backgroundColor: "var(--line)",
      opacity: 0.85,
      animation: "skeleton-pulse 1.2s ease-in-out infinite"
    }}
  />
);

export const SkeletonRows: React.FC<{ testId: string; rows?: number }> = ({ testId, rows = 6 }) => (
  <div data-testid={testId} style={{ padding: "var(--space-4, 16px) var(--layout-gutter)", display: "grid", gap: "12px" }}>
    <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 0.45 } 50% { opacity: 0.9 } }`}</style>
    {Array.from({ length: rows }, (_, index) => (
      <Skeleton key={index} height={18} width={index % 3 === 0 ? "40%" : "100%"} />
    ))}
  </div>
);
