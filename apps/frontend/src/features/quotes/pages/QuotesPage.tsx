import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Table } from "../../../components/ui/Table";
import { labelStatus, statusVariant } from "../../enquiries/status";
import { listQuotes } from "../quotes.api";
import type { QuoteItem } from "../types";

const FILTERS = ["", "draft", "sent", "accepted", "rejected", "expired"];

export const QuotesPage: React.FC = () => {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<QuoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = (next = status) => {
    setIsLoading(true);
    setError(null);
    listQuotes(next || undefined)
      .then((response) => setRows(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load quotes."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <PageHeader title="Quotes" description="Quotes start from an approved enquiry." actions={<Button variant="secondary" size="sm" onClick={() => load()} isLoading={isLoading}>Refresh</Button>} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px var(--layout-gutter)" }}>
        {FILTERS.map((value) => (
          <Button key={value || "all"} size="sm" variant={status === value ? "primary" : "outline"} onClick={() => setStatus(value)}>
            {value ? labelStatus(value) : "All"}
          </Button>
        ))}
      </div>
      {error && <div style={{ padding: "0 var(--layout-gutter) 12px" }}><Alert variant="danger" title="Request failed">{error}</Alert></div>}
      {isLoading && <p style={{ padding: "24px var(--layout-gutter)", color: "var(--text-muted)" }}>Loading quotes...</p>}
      {!isLoading && !error && (
        <Table
          data={rows}
          keyExtractor={(item) => item.id}
          emptyMessage="No quotes in this status."
          columns={[
            { key: "id", header: "Quote", render: (item) => <Link to={`/app/quotes/${item.id}`}>{item.id}</Link> },
            { key: "customer", header: "Customer", render: (item) => item.customerName },
            { key: "package", header: "Package", render: (item) => item.packageCode ?? "—" },
            { key: "total", header: "Total", align: "right", render: (item) => item.totalInr.toLocaleString("en-IN") },
            { key: "until", header: "Valid until", render: (item) => item.validUntil ?? "—" },
            { key: "status", header: "Status", render: (item) => <Badge variant={statusVariant(item.status)}>{labelStatus(item.status)}</Badge> }
          ]}
        />
      )}
    </div>
  );
};
