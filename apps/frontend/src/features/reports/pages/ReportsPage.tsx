import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { listJobMargins, listServiceTickets } from "../reports.api";
import {
  countOpenTickets,
  formatInr,
  isUnfinished,
  labelStatus,
  orderStatusVariant
} from "../status";
import type { JobMarginItem } from "../types";

type Filter = "all" | "unfinished";

export const ReportsPage: React.FC = () => {
  const [rows, setRows] = useState<JobMarginItem[]>([]);
  const [openTickets, setOpenTickets] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([listJobMargins(), listServiceTickets()])
      .then(([margins, tickets]) => {
        setRows(margins.data);
        setOpenTickets(countOpenTickets(tickets.data.map((item) => item.status)));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load reports."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = filter === "unfinished" ? rows.filter((row) => isUnfinished(row.status)) : rows;
  const completedJobs = rows.filter((row) => row.status === "completed").length;
  const unfinishedOrders = rows.filter((row) => isUnfinished(row.status)).length;

  const tiles = [
    { label: "Completed jobs", value: completedJobs === 0 ? "None" : String(completedJobs) },
    { label: "Open tickets", value: openTickets === 0 ? "None" : String(openTickets) },
    { label: "Unfinished orders", value: unfinishedOrders === 0 ? "None" : String(unfinishedOrders) }
  ];

  return (
    <div>
      <PageHeader
        title="This month"
        description="Job margins and unfinished work for the director."
        actions={
          <Button variant="secondary" size="sm" onClick={load} isLoading={isLoading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div style={{ padding: "16px var(--layout-gutter)" }}>
          <Alert variant="danger" title="Request failed">
            {error}
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={load}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {isLoading && <SkeletonRows testId="reports-skeleton" />}

      {!isLoading && !error && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              padding: "16px var(--layout-gutter)"
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.label}
                style={{
                  backgroundColor: "var(--section)",
                  border: "var(--border-default)",
                  padding: "16px",
                  borderRadius: "var(--radius-card, 6px)"
                }}
              >
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>{tile.label}</p>
                <p style={{ margin: "8px 0 0", fontSize: "var(--text-xl, 22px)", fontWeight: 650 }}>{tile.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "0 var(--layout-gutter) 12px" }}>
            <Button size="sm" variant={filter === "all" ? "primary" : "outline"} onClick={() => setFilter("all")}>
              All
            </Button>
            <Button
              size="sm"
              variant={filter === "unfinished" ? "primary" : "outline"}
              onClick={() => setFilter("unfinished")}
            >
              Unfinished
            </Button>
          </div>

          {visible.length === 0 ? (
            <div data-testid="reports-empty" style={{ padding: "32px var(--layout-gutter)" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>No jobs to report</h2>
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                Accept a quote and move an order through the pipeline to see margin estimates here.
              </p>
            </div>
          ) : (
            <Table
              data={visible}
              keyExtractor={(item) => item.orderId}
              columns={[
                {
                  key: "order",
                  header: "Order",
                  render: (item) => <Link to={`/app/orders/${item.orderId}`}>{item.orderId}</Link>
                },
                { key: "customer", header: "Customer", render: (item) => item.customerName },
                {
                  key: "status",
                  header: "Status",
                  render: (item) => <Badge variant={orderStatusVariant(item.status)}>{labelStatus(item.status)}</Badge>
                },
                {
                  key: "revenue",
                  header: "Revenue",
                  align: "right",
                  render: (item) => formatInr(item.revenueInr)
                },
                {
                  key: "cost",
                  header: "Cost estimate",
                  align: "right",
                  render: (item) => formatInr(item.cogsEstimateInr)
                },
                {
                  key: "margin",
                  header: "Margin",
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
                }
              ]}
            />
          )}
        </>
      )}
    </div>
  );
};
