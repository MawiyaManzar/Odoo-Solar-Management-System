import React from "react";
import { CheckIcon, TruckIcon } from "../../../components/ui/icons";

type StepKey = "confirmed" | "payment" | "dispatch" | "installation" | "completed";

function paymentStepLabel(status: string, balanceInr: number): string {
  if (balanceInr <= 0 && status !== "awaiting_payment" && status !== "cancelled") {
    return "Paid in full";
  }
  if (status === "awaiting_payment" || status === "cancelled") {
    return "Payment";
  }
  return "Advance received";
}

function stepIndex(status: string): number {
  if (status === "cancelled") return -1;
  if (status === "awaiting_payment") return 0;
  if (status === "paid") return 1;
  if (status === "packing" || status === "dispatched") return 2;
  if (status === "installing") return 3;
  if (status === "completed") return 4;
  return 0;
}

function dispatchSubLabel(status: string, dispatchStatus: string | null): string | null {
  if (status !== "packing" && status !== "dispatched") return null;
  if (dispatchStatus === "delivered") return "Delivered";
  if (dispatchStatus === "in_transit") return "In transit";
  if (dispatchStatus === "packing" || status === "packing") return "Packing";
  return null;
}

export const OrderStatusStepper: React.FC<{
  status: string;
  dispatchStatus: string | null;
  balanceInr?: number;
}> = ({ status, dispatchStatus, balanceInr = 0 }) => {
  const current = stepIndex(status);
  const sub = dispatchSubLabel(status, dispatchStatus);
  const steps: { key: StepKey; label: string }[] = [
    { key: "confirmed", label: "Order Confirmed" },
    { key: "payment", label: paymentStepLabel(status, balanceInr) },
    { key: "dispatch", label: "Dispatch" },
    { key: "installation", label: "Installation" },
    { key: "completed", label: "Completed" }
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
        gap: "8px",
        padding: "16px 0 4px"
      }}
    >
      {steps.map((step, index) => {
        const done = current > index || (current === index && status === "completed" && index === 4);
        const active = current === index && status !== "completed";
        const muted = current < index || current < 0;
        return (
          <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "4px" }}>
              {index > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    backgroundColor: current >= index ? "var(--brand)" : "var(--line)"
                  }}
                />
              )}
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: done || active ? "var(--brand)" : "var(--section)",
                  border: `1px solid ${done || active ? "var(--brand)" : "var(--line-strong)"}`,
                  color: done || active ? "var(--on-brand)" : "var(--text-muted)",
                  flexShrink: 0
                }}
              >
                {done && !active ? (
                  <CheckIcon size={14} />
                ) : active && step.key === "dispatch" ? (
                  <TruckIcon size={14} />
                ) : (
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    backgroundColor: current > index ? "var(--brand)" : "var(--line)"
                  }}
                />
              )}
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: active || done ? 600 : 500,
                  color: muted ? "var(--text-muted)" : "var(--text)"
                }}
              >
                {step.label}
              </div>
              {active && sub && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--brand)",
                    backgroundColor: "var(--brand-tint)",
                    border: "1px solid var(--brand-line)",
                    borderRadius: "var(--radius-badge)",
                    padding: "2px 8px"
                  }}
                >
                  {sub}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
