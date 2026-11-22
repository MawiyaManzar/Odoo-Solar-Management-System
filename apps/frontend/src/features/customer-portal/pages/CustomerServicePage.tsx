import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { labelStatus as labelTicketStatus } from "../../service-tickets/status";
import {
  createCustomerTicket,
  getCustomerToken,
  listCustomerOrders,
  listCustomerTickets,
  type CustomerOrder,
  type CustomerServiceTicket
} from "../../customer-quotes/customer-quote.api";

export const CustomerServicePage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [tickets, setTickets] = useState<CustomerServiceTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serialUnitId, setSerialUnitId] = useState("");
  const [description, setDescription] = useState("");
  const [faultCode, setFaultCode] = useState("");
  const [billableInr, setBillableInr] = useState("1500");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const serials = useMemo(
    () =>
      orders.flatMap((order) =>
        order.serials
          .filter((serial) => serial.deliveredAt)
          .map((serial) => ({ ...serial, orderId: order.id }))
      ),
    [orders]
  );

  const selected = serials.find((serial) => serial.id === serialUnitId);

  const load = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([listCustomerOrders(), listCustomerTickets()])
      .then(([ordersResponse, ticketsResponse]) => {
        setOrders(ordersResponse.data);
        setTickets(ticketsResponse.data);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load service requests."))
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

  const submit = () => {
    setFormError(null);
    if (!serialUnitId) {
      setFormError("Pick a delivered serial.");
      return;
    }
    if (!description.trim()) {
      setFormError("Describe the fault.");
      return;
    }
    const amount = Number(billableInr);
    setSaving(true);
    createCustomerTicket({
      serialUnitId,
      faultCode: faultCode.trim() || undefined,
      description: description.trim(),
      billableInr:
        selected?.underWarranty === false && Number.isFinite(amount)
          ? amount
          : selected?.underWarranty === true
            ? undefined
            : amount
    })
      .then(() => {
        setDescription("");
        setFaultCode("");
        load();
      })
      .catch((err: unknown) => setFormError(err instanceof Error ? err.message : "Could not submit request."))
      .finally(() => setSaving(false));
  };

  return (
    <main style={{ padding: "24px var(--layout-gutter) 48px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)" }}>Service Requests</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Raise a repair request against a delivered serial on your order.
        </p>
      </div>

      {isLoading && <SkeletonRows testId="customer-service-skeleton" />}
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

      {!isLoading && !error && (
        <>
          <section
            style={{
              border: "var(--border-default)",
              borderRadius: "var(--radius-card)",
              backgroundColor: "var(--card)",
              padding: "16px",
              display: "grid",
              gap: "12px",
              maxWidth: "520px"
            }}
          >
            <strong>New request</strong>
            {serials.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                No delivered serials yet. Warranty and service open after dispatch is delivered.
              </p>
            ) : (
              <>
                <Select
                  label="Serial"
                  value={serialUnitId}
                  onChange={(event) => setSerialUnitId(event.target.value)}
                  options={[
                    { value: "", label: "Select serial" },
                    ...serials.map((serial) => ({
                      value: serial.id,
                      label: `${serial.productName} · ${serial.serialNumber}`
                    }))
                  ]}
                />
                <Input label="Fault code" value={faultCode} onChange={(event) => setFaultCode(event.target.value)} />
                <Input
                  label="What went wrong"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                />
                {selected && selected.underWarranty !== true && (
                  <Input
                    label="Billable (INR)"
                    type="number"
                    min="0"
                    value={billableInr}
                    onChange={(event) => setBillableInr(event.target.value)}
                  />
                )}
                {formError && <p style={{ margin: 0, color: "var(--danger-text)", fontSize: "var(--text-sm)" }}>{formError}</p>}
                <Button variant="primary" onClick={submit} isLoading={saving} disabled={serials.length === 0}>
                  Submit request
                </Button>
              </>
            )}
          </section>

          {tickets.length === 0 ? (
            <div data-testid="customer-service-empty">
              <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>No service requests</h2>
              <p style={{ margin: 0, color: "var(--text-muted)" }}>Open requests appear here after you submit one.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  style={{
                    border: "var(--border-default)",
                    borderRadius: "var(--radius-card)",
                    backgroundColor: "var(--card)",
                    padding: "14px",
                    display: "grid",
                    gap: "6px"
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{ticket.id}</span>
                    <Badge variant="neutral">{labelTicketStatus(ticket.status)}</Badge>
                    {ticket.underWarranty === true && <Badge variant="success">Under warranty</Badge>}
                    {ticket.underWarranty === false && <Badge variant="warning">Billable</Badge>}
                  </div>
                  <p style={{ margin: 0 }}>
                    {ticket.productName ?? "Serial"} · {ticket.serialNumber ?? "—"}
                  </p>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{ticket.description}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
};
