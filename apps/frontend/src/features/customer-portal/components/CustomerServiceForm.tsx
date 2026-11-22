import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { createCustomerTicket, type CustomerOrder } from "../../customer-quotes/customer-quote.api";

type Serial = CustomerOrder["serials"][number];

export const CustomerServiceForm: React.FC<{ serial: Serial; onCreated: () => void }> = ({ serial, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [faultCode, setFaultCode] = useState("");
  const [billableInr, setBillableInr] = useState("1500");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!serial.deliveredAt) return null;

  const submit = () => {
    setError(null);
    if (!description.trim()) {
      setError("Describe the fault.");
      return;
    }
    const amount = Number(billableInr);
    setSaving(true);
    createCustomerTicket({
      serialUnitId: serial.id,
      faultCode: faultCode.trim() || undefined,
      description: description.trim(),
      billableInr: serial.underWarranty === false && Number.isFinite(amount) ? amount : serial.underWarranty === true ? undefined : amount
    })
      .then(() => {
        setOpen(false);
        setDescription("");
        setFaultCode("");
        onCreated();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not submit request."))
      .finally(() => setSaving(false));
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Request service
      </Button>
    );
  }

  return (
    <div style={{ display: "grid", gap: "8px", maxWidth: "420px", borderTop: "var(--border-default)", paddingTop: "8px" }}>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {serial.underWarranty === true
          ? "Under warranty — repair is free if the serial matches your order."
          : "Out of warranty — enter parts and labour to invoice."}
      </p>
      <Input label="Fault code" value={faultCode} onChange={(event) => setFaultCode(event.target.value)} placeholder="E-04" />
      <Input label="What went wrong" value={description} onChange={(event) => setDescription(event.target.value)} required />
      {serial.underWarranty !== true && (
        <Input
          label="Billable (INR)"
          type="number"
          min="0"
          value={billableInr}
          onChange={(event) => setBillableInr(event.target.value)}
        />
      )}
      {error && <p style={{ margin: 0, color: "var(--danger-text)", fontSize: "var(--text-sm)" }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px" }}>
        <Button size="sm" variant="primary" onClick={submit} isLoading={saving}>
          Submit
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
