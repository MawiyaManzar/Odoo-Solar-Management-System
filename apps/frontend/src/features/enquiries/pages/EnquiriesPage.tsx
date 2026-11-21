import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Table } from "../../../components/ui/Table";
import { listEnquiries } from "../enquiries.api";
import { labelStatus, statusVariant } from "../status";
import type { EnquiryItem } from "../types";

const FILTERS = ["", "new", "qualifying", "survey_scheduled", "survey_done", "quoted", "won", "lost"];

export const EnquiriesPage: React.FC = () => {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<EnquiryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = (next = status) => {
    setIsLoading(true);
    setError(null);
    listEnquiries(next || undefined)
      .then((response) => setRows(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load enquiries."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="One row per enquiry. Open a row to qualify it."
        actions={
          <Button variant="secondary" size="sm" onClick={() => load()} isLoading={isLoading}>
            Refresh
          </Button>
        }
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px var(--layout-gutter)" }}>
        {FILTERS.map((value) => (
          <Button key={value || "all"} size="sm" variant={status === value ? "primary" : "outline"} onClick={() => setStatus(value)}>
            {value ? labelStatus(value) : "All"}
          </Button>
        ))}
      </div>
      {error && (
        <div style={{ padding: "0 var(--layout-gutter) 12px" }}>
          <Alert variant="danger" title="Request failed">{error}</Alert>
        </div>
      )}
      {isLoading && <p style={{ padding: "24px var(--layout-gutter)", color: "var(--text-muted)" }}>Loading enquiries...</p>}
      {!isLoading && !error && (
        <Table
          data={rows}
          keyExtractor={(item) => item.id}
          emptyMessage="No enquiries in this status."
          columns={[
            { key: "customer", header: "Customer", render: (item) => <Link to={`/app/enquiries/${item.id}`}>{item.customerName}</Link> },
            { key: "phone", header: "Phone", render: (item) => item.customerPhone },
            { key: "kw", header: "kW", render: (item) => String(item.requestedKw) },
            { key: "source", header: "Source", render: (item) => labelStatus(item.source) },
            { key: "subsidy", header: "Subsidy", render: (item) => (item.wantsSubsidy ? "Yes" : "No") },
            { key: "status", header: "Status", render: (item) => <Badge variant={statusVariant(item.status)}>{labelStatus(item.status)}</Badge> }
          ]}
        />
      )}
    </div>
  );
};
