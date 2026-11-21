import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { payCustomerOrder, type CustomerOrder } from "../../customer-quotes/customer-quote.api";
import { formatInr } from "../../orders/status";

/** Matches backend `minAdvanceInr` / `meetsAdvanceGate` (paise-safe 30%). */
function minAdvanceInr(totalInr: number): number {
  const total = Math.round(totalInr * 100);
  if (total <= 0) return 0;
  return Math.ceil((total * 3) / 10) / 100;
}

function halfInr(totalInr: number): number {
  return Math.round(totalInr * 100) / 200;
}

export const CustomerPayForm: React.FC<{ order: CustomerOrder; onPaid: () => void }> = ({ order, onPaid }) => {
  const [amount, setAmount] = useState(String(Math.min(minAdvanceInr(order.totalInr), order.balanceInr)));
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canPay = order.balanceInr > 0 && order.status !== "cancelled";

  useEffect(() => {
    setAmount(String(Math.min(minAdvanceInr(order.totalInr), order.balanceInr)));
  }, [order.balanceInr, order.totalInr, order.id]);

  if (!canPay) return null;

  const choose = (ratio: "advance" | "half") => {
    const target = ratio === "advance" ? minAdvanceInr(order.totalInr) : halfInr(order.totalInr);
    setAmount(String(Math.min(target, order.balanceInr)));
  };

  const submit = () => {
    const amountInr = Number(amount);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (amountInr > order.balanceInr) {
      setError("Amount cannot be more than the balance.");
      return;
    }
    if (reference.trim().length < 6) {
      setError("Enter the UPI UTR (at least 6 characters).");
      return;
    }
    setSaving(true);
    setError(null);
    const kind = amountInr >= order.balanceInr ? "full" : order.paidInr > 0 ? "balance" : "advance";
    payCustomerOrder(order.id, { amountInr, kind, reference: reference.trim() })
      .then(() => {
        setReference("");
        onPaid();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not record the payment."))
      .finally(() => setSaving(false));
  };

  return (
    <div style={{ display: "grid", gap: "12px", maxWidth: "420px" }}>
      <h3 style={{ margin: "8px 0 0", fontSize: "var(--text-base, 15px)" }}>Pay with UPI</h3>
      <p style={{ margin: 0, color: "var(--text-muted)" }}>
        Pay in your UPI app, then enter the amount and the UTR here. 30% of {formatInr(order.totalInr)} releases packing.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <Button type="button" size="sm" variant="outline" onClick={() => choose("advance")}>
          30%
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => choose("half")}>
          50%
        </Button>
      </div>
      <Input label="Amount (INR)" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
      <Input label="UPI UTR" value={reference} onChange={(event) => setReference(event.target.value)} required />
      {error && <p style={{ margin: 0, color: "var(--danger-text)" }}>{error}</p>}
      <Button type="button" variant="primary" onClick={submit} isLoading={saving}>
        Record UPI payment
      </Button>
    </div>
  );
};
