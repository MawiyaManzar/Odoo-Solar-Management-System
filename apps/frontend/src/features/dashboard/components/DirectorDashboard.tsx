import React, { useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useDirectorDashboard } from "../hooks/useDirectorDashboard";
import { PERIOD_OPTIONS, type DashboardPeriod } from "../period";
import "../dashboard.css";
import { AttentionRequired } from "./AttentionRequired";
import { BusinessProfitability } from "./BusinessProfitability";
import { DirectorSkeleton } from "./DirectorSkeleton";
import { JobProfitability } from "./JobProfitability";
import { KpiCards } from "./KpiCards";
import { OperationsPipeline } from "./OperationsPipeline";
import { PeriodFilter } from "./PeriodFilter";

export const DirectorDashboard: React.FC = () => {
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const { isLoading, error, data, reload } = useDirectorDashboard(period);
  const periodLabel = PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "This Month";

  return (
    <div>
      <PageHeader
        title="Business Overview"
        description="Overview of your solar operations and business performance."
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      {isLoading && <DirectorSkeleton />}

      {error && (
        <div style={{ padding: "16px var(--layout-gutter)" }}>
          <Alert variant="danger" title="Request failed">
            {error}
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={reload}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="director-dash">
          <KpiCards kpis={data.kpis} periodLabel={periodLabel} />
          <div className="director-mid">
            <OperationsPipeline pipeline={data.pipeline} />
            <BusinessProfitability profitability={data.profitability} periodLabel={periodLabel} />
          </div>
          <div className="director-bottom">
            <AttentionRequired items={data.attention} />
            <JobProfitability rows={data.jobs} />
          </div>
        </div>
      )}
    </div>
  );
};
