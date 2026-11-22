import React from "react";
import { PERIOD_OPTIONS, type DashboardPeriod } from "../period";
import "../dashboard.css";

interface Props {
  value: DashboardPeriod;
  onChange: (next: DashboardPeriod) => void;
}

export const PeriodFilter: React.FC<Props> = ({ value, onChange }) => (
  <div className="director-period" role="group" aria-label="Date period">
    {PERIOD_OPTIONS.map((option) => (
      <button
        key={option.id}
        type="button"
        className={`director-period__btn${value === option.id ? " is-active" : ""}`}
        onClick={() => onChange(option.id)}
        aria-pressed={value === option.id}
      >
        {option.label}
      </button>
    ))}
  </div>
);
