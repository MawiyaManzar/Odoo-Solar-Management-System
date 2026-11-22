import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { labelStatus, statusVariant } from "../../enquiries/status";
import { formatInr } from "../../orders/status";
import type { QuoteItem } from "../../quotes/types";
import { getCustomerToken, listCustomerQuotes } from "../../customer-quotes/customer-quote.api";

export const CustomerQuotesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    setError(null);
    listCustomerQuotes()
      .then((response) => setQuotes(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load quotes."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!getCustomerToken()) {
      navigate("/login", { replace: true });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <main style={{ padding: "24px var(--layout-gutter) 48px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)" }}>My Quotes</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Review sent quotations and accept or reject when ready.
        </p>
      </div>
      {isLoading && <SkeletonRows testId="customer-quotes-skeleton" />}
      {error && (
        <Alert variant="danger" title="Request failed">
          {error}
          <div style={{ marginTop: "8px" }}>
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        </Alert>
      )}
      {!isLoading && !error && quotes.length === 0 && (
        <div data-testid="customer-quotes-empty">
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>No quotes yet</h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            When sales sends a quotation, it appears here. You can also open the link they shared.
          </p>
        </div>
      )}
      {!isLoading && !error && quotes.length > 0 && (
        <Table
          data={quotes}
          keyExtractor={(quote) => quote.id}
          emptyMessage="No quotes yet."
          columns={[
            { key: "id", header: "Quote", isMono: true },
            { key: "packageCode", header: "Package", render: (quote) => quote.packageCode ?? "—" },
            {
              key: "totalInr",
              header: "Total",
              isMono: true,
              render: (quote) => formatInr(quote.totalInr)
            },
            {
              key: "validUntil",
              header: "Valid until",
              isMono: true,
              render: (quote) =>
                quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("en-IN") : "—"
            },
            {
              key: "status",
              header: "Status",
              render: (quote) => <Badge variant={statusVariant(quote.status)}>{labelStatus(quote.status)}</Badge>
            },
            {
              key: "open",
              header: "",
              render: (quote) => (
                <Link to={`/my/quotes/${quote.id}`} style={{ color: "var(--accent-text)" }}>
                  Open
                </Link>
              )
            }
          ]}
        />
      )}
    </main>
  );
};
