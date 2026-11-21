import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Table } from "../../../components/ui/Table";
import { labelStatus, statusVariant } from "../../enquiries/status";
import { acceptQuote, getQuote, rejectQuote, sendQuote } from "../quotes.api";
import type { QuoteItem } from "../types";

export const QuoteDetailPage: React.FC = () => {
  const { quoteId = "" } = useParams();
  const { user } = useAuth();
  const canWrite = user?.role === "sales" || user?.role === "admin";
  const [quote, setQuote] = useState<QuoteItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getQuote(quoteId);
      setQuote(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load quote.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const run = async (action: () => Promise<{ data: QuoteItem; message?: string }>, fallback: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await action();
      setQuote(response.data);
      setInfo(response.message ?? fallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  const customerLink = quote ? (quote.customerPath ?? `/my/quotes/${quote.id}`) : "";

  return (
    <div>
      <PageHeader
        title={quote ? `Quote ${quote.id}` : "Quote"}
        description={quote ? `${quote.customerName} · ${quote.packageCode ?? "Custom"}` : undefined}
        actions={<Link to="/app/quotes">Back to quotes</Link>}
      />
      <div style={{ padding: "16px var(--layout-gutter)", display: "flex", flexDirection: "column", gap: "12px" }}>
        {isLoading && <p style={{ color: "var(--text-muted)" }}>Loading quote...</p>}
        {error && <Alert variant="danger" title="Request failed">{error}</Alert>}
        {info && <Alert variant="success" title="Updated">{info}</Alert>}
        {quote && (
          <>
            <Badge variant={statusVariant(quote.status)}>{labelStatus(quote.status)}</Badge>
            <Table
              data={quote.lines ?? []}
              keyExtractor={(item) => item.id}
              emptyMessage="No lines."
              columns={[
                { key: "product", header: "Product", render: (item) => item.description ?? item.productId },
                { key: "qty", header: "Qty", render: (item) => String(item.qty) },
                { key: "price", header: "Unit price", align: "right", render: (item) => item.unitPriceInr.toLocaleString("en-IN") },
                { key: "total", header: "Line total", align: "right", render: (item) => item.lineTotalInr.toLocaleString("en-IN") }
              ]}
            />
            <p style={{ margin: 0 }}>Subtotal {quote.subtotalInr.toLocaleString("en-IN")} · Discount {quote.discountInr.toLocaleString("en-IN")} · Total {quote.totalInr.toLocaleString("en-IN")}</p>
            {quote.status !== "draft" && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <p style={{ margin: 0 }}>
                  Customer link:{" "}
                  <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{customerLink}</span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(customerLink, "_blank", "noopener,noreferrer")}
                >
                  Open customer link
                </Button>
              </div>
            )}
            {canWrite && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Button type="button" variant="secondary" disabled={quote.status !== "draft" || saving} onClick={() => void run(() => sendQuote(quote.id), "Quote sent.")}>Send</Button>
                <Button type="button" disabled={quote.status !== "sent" || saving} onClick={() => void run(() => acceptQuote(quote.id), "Quote accepted.")}>Accept</Button>
                <Button type="button" variant="danger" disabled={(quote.status !== "draft" && quote.status !== "sent") || saving} onClick={() => void run(() => rejectQuote(quote.id), "Quote rejected.")}>Reject</Button>
              </div>
            )}
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
              The customer accepts or rejects on their link after a phone code. Sales can still record the answer here. Accept creates an order awaiting payment.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
