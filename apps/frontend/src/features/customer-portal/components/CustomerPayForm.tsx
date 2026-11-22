import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { CreditCardIcon } from "../../../components/ui/icons";
import { startCustomerCheckout, type CustomerOrder } from "../../customer-quotes/customer-quote.api";
import { formatInr } from "../../orders/status";

function minAdvanceInr(totalInr: number): number {
  const total = Math.round(totalInr * 100);
  if (total <= 0) return 0;
  return Math.ceil((total * 3) / 10) / 100;
}

function halfInr(totalInr: number): number {
  return Math.round(totalInr * 100) / 200;
}

type PayChoice = "primary" | "secondary";

function payOptions(order: CustomerOrder): {
  advanceMet: boolean;
  primary: { amount: number; label: string };
  secondary: { amount: number; label: string } | null;
} {
  const balance = order.balanceInr;
  const advanceTarget = minAdvanceInr(order.totalInr);
  const advanceMet = order.paidInr + 1e-9 >= advanceTarget;

  if (!advanceMet) {
    const advance = Math.min(advanceTarget, balance);
    const half = Math.min(halfInr(order.totalInr), balance);
    const showHalf = half > 0 && Math.abs(half - advance) > 1e-9;
    return {
      advanceMet: false,
      primary: { amount: advance, label: `Pay 30% advance — ${formatInr(advance)}` },
      secondary: showHalf ? { amount: half, label: `Pay 50% — ${formatInr(half)}` } : null
    };
  }

  const remaining = balance;
  const installment = Math.min(advanceTarget, balance);
  if (installment <= 0 || Math.abs(installment - remaining) < 1e-9) {
    return {
      advanceMet: true,
      primary: { amount: remaining, label: `Pay remaining — ${formatInr(remaining)}` },
      secondary: null
    };
  }

  return {
    advanceMet: true,
    primary: { amount: remaining, label: `Pay remaining — ${formatInr(remaining)}` },
    secondary: { amount: installment, label: `Pay ${formatInr(installment)}` }
  };
}

export const CustomerPayForm: React.FC<{ order: CustomerOrder }> = ({ order }) => {
  const options = payOptions(order);
  const [choice, setChoice] = useState<PayChoice>("primary");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canPay = order.balanceInr > 0 && order.status !== "cancelled";

  const amount =
    choice === "secondary" && options.secondary ? options.secondary.amount : options.primary.amount;

  useEffect(() => {
    setChoice("primary");
  }, [order.id, order.paidInr, order.balanceInr]);

  if (!canPay) return null;

  const submit = () => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (amount > order.balanceInr) {
      setError("Amount cannot be more than the balance.");
      return;
    }
    setSaving(true);
    setError(null);
    startCustomerCheckout(order.id, amount)
      .then((response) => {
        window.location.assign(response.data.url);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not start Stripe Checkout.");
        setSaving(false);
      });
  };

  const optionStyle = (selected: boolean): React.CSSProperties => ({
    border: selected ? "1px solid var(--brand)" : "var(--border-default)",
    backgroundColor: selected ? "var(--brand-tint)" : "var(--card)",
    borderRadius: "var(--radius-card)",
    padding: "12px 14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  });

  return (
    <div
      style={{
        border: "var(--border-default)",
        borderRadius: "var(--radius-card)",
        backgroundColor: "var(--card)",
        padding: "16px",
        display: "grid",
        gap: "14px"
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Remaining Payment</h3>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          {options.advanceMet
            ? "Advance is in. Pay the balance when you are ready — packing already unlocked."
            : "Pay with card on Stripe Checkout. 30% of the total unlocks packing."}
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)"
        }}
      >
        <div>
          <div style={{ color: "var(--text-muted)" }}>Total</div>
          <div style={{ fontWeight: 600 }}>{formatInr(order.totalInr)}</div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)" }}>Paid</div>
          <div style={{ fontWeight: 600, color: "var(--success-text)" }}>{formatInr(order.paidInr)}</div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)" }}>Balance</div>
          <div style={{ fontWeight: 600 }}>{formatInr(order.balanceInr)}</div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: options.secondary ? "1fr 1fr" : "1fr",
          gap: "10px"
        }}
      >
        <label style={optionStyle(choice === "primary")}>
          <input
            type="radio"
            name={`pay-${order.id}`}
            checked={choice === "primary"}
            onChange={() => setChoice("primary")}
          />
          <span>{options.primary.label}</span>
        </label>
        {options.secondary && (
          <label style={optionStyle(choice === "secondary")}>
            <input
              type="radio"
              name={`pay-${order.id}`}
              checked={choice === "secondary"}
              onChange={() => setChoice("secondary")}
            />
            <span>{options.secondary.label}</span>
          </label>
        )}
      </div>
      {error && <p style={{ margin: 0, color: "var(--danger-text)", fontSize: "var(--text-sm)" }}>{error}</p>}
      <div>
        <Button type="button" variant="primary" onClick={submit} isLoading={saving}>
          <CreditCardIcon size={16} /> Pay with Card
        </Button>
      </div>
    </div>
  );
};
