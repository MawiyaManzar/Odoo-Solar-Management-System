import React from "react";
import { BriefcaseIcon, CreditCardIcon, TriangleAlertIcon, TruckIcon } from "../../../components/ui/icons";
import { formatInr } from "../../reports/status";
import type { DirectorKpis } from "../metrics";
import "../dashboard.css";

interface Props {
  kpis: DirectorKpis;
  periodLabel: string;
}

const cards: {
  key: keyof Pick<DirectorKpis, "revenueInr" | "paymentsCollectedInr" | "outstandingInr" | "activeJobs">;
  label: string;
  hint: (kpis: DirectorKpis, periodLabel: string) => string;
  format: (kpis: DirectorKpis) => string;
  tint: string;
  ink: string;
  Icon: React.FC<{ size?: number }>;
}[] = [
  {
    key: "revenueInr",
    label: "Revenue",
    hint: (_k, periodLabel) => `From completed jobs · ${periodLabel}`,
    format: (k) => formatInr(k.revenueInr),
    tint: "var(--brand-tint)",
    ink: "var(--brand)",
    Icon: BriefcaseIcon
  },
  {
    key: "paymentsCollectedInr",
    label: "Payments Collected",
    hint: () => "Customer payments received (all open jobs)",
    format: (k) => formatInr(k.paymentsCollectedInr),
    tint: "var(--success-bg)",
    ink: "var(--success)",
    Icon: CreditCardIcon
  },
  {
    key: "outstandingInr",
    label: "Outstanding",
    hint: () => "Remaining amount customers owe",
    format: (k) => formatInr(k.outstandingInr),
    tint: "var(--warning-bg)",
    ink: "var(--warning)",
    Icon: TriangleAlertIcon
  },
  {
    key: "activeJobs",
    label: "Active Jobs",
    hint: () => "In packing, dispatch, and installation",
    format: (k) => String(k.activeJobs),
    tint: "var(--accent-tint)",
    ink: "var(--accent)",
    Icon: TruckIcon
  }
];

export const KpiCards: React.FC<Props> = ({ kpis, periodLabel }) => (
  <div className="director-kpi">
    {cards.map((card) => (
      <div
        key={card.key}
        className="director-card director-kpi-card"
        style={{ background: card.tint, borderColor: "var(--line)" }}
      >
        <div className="director-kpi-card__top">
          <p className="director-kpi-card__label">{card.label}</p>
          <span className="director-kpi-card__icon" style={{ background: "var(--card)", color: card.ink }}>
            <card.Icon size={18} />
          </span>
        </div>
        <p className="director-kpi-card__value">{card.format(kpis)}</p>
        <p className="director-kpi-card__hint">{card.hint(kpis, periodLabel)}</p>
      </div>
    ))}
  </div>
);
