import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { listOrders } from "../orders.api";
import { formatInr, formatWhen, labelStatus, ORDER_FILTERS, orderStatusVariant } from "../status";
import type { OrderItem, OrderStatus } from "../types";

export const OrdersPage: React.FC = () => {
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [rows, setRows] = useState<OrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = (next: "" | OrderStatus = status) => {
    setIsLoading(true);
    setError(null);
    listOrders(next || undefined)
      .then((response) => setRows(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load orders."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Confirmed jobs after a quote is accepted."
        actions={
          <Button variant="secondary" size="sm" onClick={() => load()} isLoading={isLoading}>
            Refresh
          </Button>
        }
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px var(--layout-gutter)" }}>
        {ORDER_FILTERS.map((value) => (
          <Button key={value || "all"} size="sm" variant={status === value ? "primary" : "outline"} onClick={() => setStatus(value)}>
            {value ? labelStatus(value) : "All"}
          </Button>
        ))}
      </div>
      {error && (
        <div style={{ padding: "0 var(--layout-gutter) 12px" }}>
          <Alert variant="danger" title="Request failed">
            {error}
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={() => load()}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}
      {isLoading && <SkeletonRows testId="orders-skeleton" />}
      {!isLoading && !error && rows.length === 0 && (
        <div data-testid="orders-empty" style={{ padding: "32px var(--layout-gutter)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>No orders in this status</h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>Accept a quote to create an order, then record the advance here.</p>
        </div>
      )}
      {!isLoading && !error && rows.length > 0 && (
        <Table
          data={rows}
          keyExtractor={(item) => item.id}
          columns={[
            { key: "id", header: "Order", render: (item) => <Link to={`/app/orders/${item.id}`}>{item.id}</Link> },
            { key: "customer", header: "Customer", render: (item) => item.customerName },
            { key: "site", header: "Site", render: (item) => item.siteAddress },
            { key: "kw", header: "kW", render: (item) => item.systemKw.toFixed(1) },
            { key: "kind", header: "Kind", render: (item) => labelStatus(item.systemKind) },
            { key: "total", header: "Total", align: "right", render: (item) => formatInr(item.totalInr) },
            { key: "when", header: "Install date", render: (item) => formatWhen(item.scheduledInstallAt) },
            {
              key: "status",
              header: "Status",
              render: (item) => <Badge variant={orderStatusVariant(item.status)}>{labelStatus(item.status)}</Badge>
            }
          ]}
        />
      )}
    </div>
  );
};
