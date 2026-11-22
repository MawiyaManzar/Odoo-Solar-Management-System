import React from "react";
import { Skeleton } from "../../../components/ui/Skeleton";
import "../dashboard.css";

export const DirectorSkeleton: React.FC = () => (
  <div className="director-skeleton" data-testid="dashboard-skeleton">
    <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 0.45 } 50% { opacity: 0.9 } }`}</style>
    <div className="director-skeleton__kpi">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="director-card" style={{ height: 132 }}>
          <Skeleton height={14} width="40%" />
          <div style={{ height: 12 }} />
          <Skeleton height={28} width="70%" />
          <div style={{ height: 12 }} />
          <Skeleton height={12} width="55%" />
        </div>
      ))}
    </div>
    <div className="director-skeleton__mid">
      <div className="director-card" style={{ height: 160 }}>
        <Skeleton height={16} width="35%" />
        <div style={{ height: 20 }} />
        <Skeleton height={72} />
      </div>
      <div className="director-card" style={{ height: 160 }}>
        <Skeleton height={16} width="45%" />
        <div style={{ height: 20 }} />
        <Skeleton height={72} />
      </div>
    </div>
    <div className="director-skeleton__bottom">
      <div className="director-card" style={{ height: 280 }}>
        <Skeleton height={16} width="50%" />
        <div style={{ height: 16 }} />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} style={{ marginBottom: 12 }}>
            <Skeleton height={36} />
          </div>
        ))}
      </div>
      <div className="director-card" style={{ height: 280 }}>
        <Skeleton height={16} width="40%" />
        <div style={{ height: 16 }} />
        <Skeleton height={200} />
      </div>
    </div>
  </div>
);
