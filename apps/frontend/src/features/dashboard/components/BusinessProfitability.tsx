import React from "react";
import { Badge } from "../../../components/ui/Badge";
import { formatInr } from "../../reports/status";
import type { ProfitabilityTotals } from "../metrics";
import "../dashboard.css";

interface Props {
  profitability: ProfitabilityTotals;
  periodLabel: string;
}

export const BusinessProfitability: React.FC<Props> = ({ profitability, periodLabel }) => {
  const pct = profitability.marginPct;
  const barWidth = pct == null ? 0 : Math.max(0, Math.min(100, pct));

  return (
    <section className="director-card">
      <h3 className="director-card__title">Business Profitability</h3>
      <p style={{ margin: "-4px 0 14px", fontSize: "var(--text-xs, 12px)", color: "var(--text-muted)" }}>
        Completed jobs · {periodLabel}. Margin uses the Reports cost estimate.
      </p>
      <div className="director-profit__grid">
        <div>
          <p className="director-profit__label">Revenue</p>
          <p className="director-profit__value">{formatInr(profitability.revenueInr)}</p>
        </div>
        <div>
          <p className="director-profit__label">Estimated Cost</p>
          <p className="director-profit__value">{formatInr(profitability.estimatedCostInr)}</p>
        </div>
        <div>
          <p className="director-profit__label">Gross Margin</p>
          <p
            className="director-profit__value"
            style={{
              color:
                profitability.grossMarginInr < 0
                  ? "var(--danger-text)"
                  : profitability.grossMarginInr > 0
                    ? "var(--success-text)"
                    : "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap"
            }}
          >
            {formatInr(profitability.grossMarginInr)}
            {pct != null && (
              <Badge variant={pct < 0 ? "danger" : "success"}>{pct.toFixed(1)}%</Badge>
            )}
          </p>
        </div>
      </div>
      <div className="director-profit__bar" aria-hidden={pct == null}>
        <div className="director-profit__bar-fill" style={{ width: `${barWidth}%` }} />
      </div>
      <p className="director-profit__bar-caption">
        {pct == null ? "No completed revenue in this period." : `Margin: ${pct.toFixed(1)}%`}
      </p>
    </section>
  );
};
