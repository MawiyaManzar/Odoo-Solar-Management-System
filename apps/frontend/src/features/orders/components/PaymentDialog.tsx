import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { recordPayment } from "../orders.api";
import type { PaymentKind, PaymentMethod } from "../types";

const KINDS: PaymentKind[] = ["advance", "balance", "full", "service"];
const METHODS: PaymentMethod[] = ["upi", "neft", "cash", "cheque"];

export const PaymentDialog: React.FC<{ orderId: string; open: boolean; onClose: () => void; onSaved: () => void }> = ({
  orderId,
  open,
  onClose,
  onSaved
}) => {
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<PaymentKind>("advance");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const amountInr = Number(amount);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    recordPayment(orderId, {
      amountInr,
      kind,
      method,
      reference: reference.trim() || undefined
    })
      .then(() => {
        setAmount("");
        setReference("");
        onSaved();
        onClose();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not record payment."))
      .finally(() => setSaving(false));
  };

  return (
    <Dialog open={open} title="Record payment" onClose={onClose}>
      <div style={{ display: "grid", gap: "12px" }}>
        <Input label="Amount (INR)" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        <Select label="Kind" value={kind} options={KINDS.map((value) => ({ value, label: value }))} onChange={(event) => setKind(event.target.value as PaymentKind)} />
        <Select label="Method" value={method} options={METHODS.map((value) => ({ value, label: value.toUpperCase() }))} onChange={(event) => setMethod(event.target.value as PaymentMethod)} />
        <Input label="Reference (UTR or receipt)" value={reference} onChange={(event) => setReference(event.target.value)} />
        {error && <p style={{ color: "var(--danger-text)", margin: 0 }}>{error}</p>}
        <Button variant="primary" onClick={submit} isLoading={saving}>
          Save payment
        </Button>
      </div>
    </Dialog>
  );
};
