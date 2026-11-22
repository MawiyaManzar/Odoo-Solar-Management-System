import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import { Table } from "../../../components/ui/Table";
import { formatInr, labelStatus, orderStatusVariant } from "../../reports/status";
import type { JobProfitRow } from "../metrics";
import "../dashboard.css";

interface Props {
  rows: JobProfitRow[];
}

export const JobProfitability: React.FC<Props> = ({ rows }) => (
  <section className="director-card">
    <div className="director-card__head">
      <h3 className="director-card__title">Job Profitability</h3>
      <Link to="/app/reports" className="director-link">
        View Full Report →
      </Link>
    </div>
    {rows.length === 0 ? (
      <div data-testid="dashboard-jobs-empty" style={{ padding: "12px 0" }}>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
          No orders yet. Accept a quote to see job margins here.
        </p>
      </div>
    ) : (
      <div className="director-table-wrap">
        <Table
          data={rows}
          keyExtractor={(item) => item.orderId}
          columns={[
            {
              key: "order",
              header: "Order ID",
              render: (item) => <Link to={`/app/orders/${item.orderId}`}>{item.orderId}</Link>
            },
            { key: "customer", header: "Customer", render: (item) => item.customerName },
            {
              key: "size",
              header: "System Size",
              render: (item) => (item.systemKw == null ? "—" : `${item.systemKw} kW`)
            },
            {
              key: "revenue",
              header: "Revenue",
              align: "right",
              render: (item) => formatInr(item.revenueInr)
            },
            {
              key: "cost",
              header: "Estimated Cost",
              align: "right",
              render: (item) => formatInr(item.estimatedCostInr)
            },
            {
              key: "margin",
              header: "Gross Margin",
              align: "right",
              render: (item) => (
                <span
                  style={{
                    color: item.grossMarginInr < 0 ? "var(--danger-text)" : "var(--success-text)",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums"
                  }}
                >
                  {formatInr(item.grossMarginInr)}
                </span>
              )
            },
            {
              key: "status",
              header: "Status",
              render: (item) => <Badge variant={orderStatusVariant(item.status)}>{labelStatus(item.status)}</Badge>
            }
          ]}
        />
      </div>
    )}
  </section>
);
