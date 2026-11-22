import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Table } from "../../../components/ui/Table";
import { labelStatus, statusVariant } from "../../enquiries/status";
import type { QuoteItem } from "../../quotes/types";
import {
  acceptCustomerQuote,
  getCustomerQuote,
  rejectCustomerQuote,
  requestCustomerOtp,
  setCustomerToken,
  verifyCustomerOtp
} from "../customer-quote.api";
import { digitsOnlyPhone, parseIndianMobile } from "../../../lib/phone";

export const CustomerQuotePage: React.FC = () => {
  const { quoteId = "" } = useParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadQuote = async () => {
    const response = await getCustomerQuote(quoteId);
    setQuote(response.data);
  };

  const onRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const mobile = parseIndianMobile(phone);
    if (mobile == null) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    setError(null);
    setDevCode(null);
    try {
      const response = await requestCustomerOtp(mobile, quoteId);
      if (response.devCode) setDevCode(response.devCode);
      setInfo("Enter the 6-digit code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    const mobile = parseIndianMobile(phone);
    if (mobile == null) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await verifyCustomerOtp(mobile, quoteId, code);
      setCustomerToken(response.data.token);
      await loadQuote();
      setInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (action: "accept" | "reject") => {
    setBusy(true);
    setError(null);
    try {
      const response = action === "accept" ? await acceptCustomerQuote(quoteId) : await rejectCustomerQuote(quoteId);
      setQuote(response.data);
      setDevCode(null);
      setInfo(
        response.message ??
          (action === "accept"
            ? "Quote accepted."
            : "Quote rejected. Our sales team can send a corrected quotation.")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the quote.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ width: "min(720px, 100%)", padding: "24px var(--layout-gutter) 40px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl, 22px)" }}>Your quote</h1>
        {error && <Alert variant="danger" title="Request failed">{error}</Alert>}
        {info && <Alert variant="neutral" title="Next step">{info}</Alert>}
        {devCode && <Alert variant="neutral" title="Development code">{devCode}</Alert>}
        {!quote && (
          <>
            <form onSubmit={onRequest} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Input
                label="Mobile number from your inquiry"
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(digitsOnlyPhone(event.target.value))}
              />
              <Button type="submit" isLoading={busy}>Request code</Button>
            </form>
            <form onSubmit={onVerify} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Input label="Code" required inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} />
              <Button type="submit" variant="secondary" isLoading={busy}>Sign in</Button>
            </form>
          </>
        )}
        {quote && (
          <>
            <Badge variant={statusVariant(quote.status)}>{labelStatus(quote.status)}</Badge>
            <p style={{ margin: 0 }}>{quote.customerName}{quote.packageCode ? ` · ${quote.packageCode}` : ""}</p>
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
            <p style={{ margin: 0, fontWeight: 650 }}>Total {quote.totalInr.toLocaleString("en-IN")}</p>
            {quote.status === "sent" && (
              <div style={{ display: "flex", gap: "8px" }}>
                <Button type="button" disabled={busy} onClick={() => void decide("accept")}>Accept</Button>
                <Button type="button" variant="danger" disabled={busy} onClick={() => void decide("reject")}>Reject</Button>
              </div>
            )}
            {quote.status === "rejected" && (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                If something looks wrong on this quote, reply to sales or wait for a corrected quotation on My Quotes.
              </p>
            )}
          </>
        )}
    </main>
  );
};
