import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { PaymentDialog } from "../components/PaymentDialog";
import { cancelOrder, getOrder, listTechnicians, scheduleOrder } from "../orders.api";
import { formatInr, formatWhen, labelStatus, orderStatusVariant } from "../status";
import type { OrderDetail, TechnicianOption } from "../types";

const CANCEL_LOCKED = new Set(["packing", "dispatched", "installing", "completed", "cancelled"]);

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const OrderDetailPage: React.FC = () => {
  const { orderId = "" } = useParams();
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "sales";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [techs, setTechs] = useState<TechnicianOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [techId, setTechId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([getOrder(orderId), listTechnicians()])
      .then(([orderResponse, techResponse]) => {
        setOrder(orderResponse.data);
        setTechs(techResponse.data);
        setWhen(toLocalInput(orderResponse.data.scheduledInstallAt));
        setTechId(orderResponse.data.leadTechnicianId ?? techResponse.data[0]?.id ?? "");
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Could not load order.";
        if (message.toLowerCase().includes("not found")) setNotFound(true);
        setError(message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const installMinLocal = (() => {
    const now = new Date();
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00`;
  })();

  const scheduleBlocked = order?.status === "awaiting_payment" || order?.status === "cancelled";

  const saveSchedule = () => {
    if (!when || !techId) {
      setFormError("Choose an install time and a technician.");
      return;
    }
    if (when < installMinLocal) {
      setFormError("Installation can only be scheduled from today onwards.");
      return;
    }
    if (scheduleBlocked) {
      setFormError(
        order?.status === "cancelled"
          ? "Cancelled orders cannot be scheduled."
          : "Record at least 30% before scheduling installation."
      );
      return;
    }
    setSaving(true);
    setFormError(null);
    scheduleOrder(orderId, { scheduledInstallAt: new Date(when).toISOString(), leadTechnicianId: techId })
      .then((response) => setOrder(response.data))
      .catch((err: unknown) => setFormError(err instanceof Error ? err.message : "Could not schedule."))
      .finally(() => setSaving(false));
  };

  const cancel = () => {
    setSaving(true);
    cancelOrder(orderId)
      .then((response) => setOrder(response.data))
      .catch((err: unknown) => setFormError(err instanceof Error ? err.message : "Could not cancel."))
      .finally(() => setSaving(false));
  };

  return (
    <div>
      <PageHeader
        title={order ? `Order ${order.id}` : "Order"}
        description={order ? `${order.customerName} · ${order.siteAddress}` : "Payment and installation schedule."}
        actions={
          <Link to="/app/orders">
            <Button variant="secondary" size="sm">
              Back to orders
            </Button>
          </Link>
        }
      />
      {isLoading && <SkeletonRows testId="order-detail-skeleton" />}
      {!isLoading && notFound && (
        <div style={{ padding: "0 var(--layout-gutter)" }}>
          <Alert variant="danger" title="Not found">
            This order does not exist.
          </Alert>
        </div>
      )}
      {!isLoading && error && !notFound && (
        <div style={{ padding: "0 var(--layout-gutter)" }}>
          <Alert variant="danger" title="Request failed">
            {error}
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={load}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}
      {!isLoading && order && (
        <div style={{ display: "grid", gap: "24px", padding: "0 var(--layout-gutter) 32px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <Badge variant={orderStatusVariant(order.status)}>{labelStatus(order.status)}</Badge>
            <span>
              {order.systemKw.toFixed(1)} kW {labelStatus(order.systemKind)}
            </span>
            <span>{formatInr(order.totalInr)}</span>
          </div>
          {order.status === "paid" && (
            <Alert variant="success" title="Ready to pack">
              Warehouse can pack this job.
            </Alert>
          )}
          <section style={{ display: "grid", gap: "12px", maxWidth: "480px" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Schedule</h2>
            <Input
              label="Install datetime"
              type="datetime-local"
              min={installMinLocal}
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              disabled={!canWrite || scheduleBlocked}
              helperText={scheduleBlocked ? "Available after 30% payment" : "Today or a future date"}
            />
            <Select
              label="Lead technician"
              value={techId}
              options={techs.map((tech) => ({ value: tech.id, label: tech.name }))}
              onChange={(event) => setTechId(event.target.value)}
              disabled={!canWrite || techs.length === 0 || scheduleBlocked}
            />
            {formError && <p style={{ color: "var(--danger-text)", margin: 0 }}>{formError}</p>}
            {canWrite && (
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" onClick={saveSchedule} isLoading={saving} disabled={scheduleBlocked || !when || !techId}>
                  Save schedule
                </Button>
                {!CANCEL_LOCKED.has(order.status) && (
                  <Button variant="danger" onClick={cancel} disabled={saving}>
                    Cancel order
                  </Button>
                )}
              </div>
            )}
          </section>
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Payments</h2>
              {canWrite && order.status !== "cancelled" && (
                <Button size="sm" variant="primary" onClick={() => setPayOpen(true)}>
                  Record payment
                </Button>
              )}
            </div>
            <Table
              data={order.payments}
              keyExtractor={(item) => item.id}
              emptyMessage="No payments recorded yet."
              columns={[
                { key: "date", header: "Date", render: (item) => formatWhen(item.paidAt) },
                { key: "kind", header: "Kind", render: (item) => labelStatus(item.kind) },
                { key: "method", header: "Method", render: (item) => (item.method ? item.method.toUpperCase() : "—") },
                { key: "ref", header: "Reference", render: (item) => item.reference ?? "—" },
                { key: "amount", header: "Amount", align: "right", render: (item) => formatInr(item.amountInr) }
              ]}
            />
            <p style={{ margin: "12px 0 0" }}>
              Paid {formatInr(order.paidInr)} / Balance {formatInr(order.balanceInr)}
            </p>
          </section>
          <section style={{ display: "flex", gap: "16px" }}>
            {order.dispatchIds.map((id) => (
              <Link key={id} to={`/app/dispatches/${id}`} style={{ color: "var(--accent-text)" }}>
                Dispatch {id}
              </Link>
            ))}
            {order.installationId && <span style={{ color: "var(--accent-text)" }}>Installation {order.installationId}</span>}
          </section>
        </div>
      )}
      {canWrite && <PaymentDialog orderId={orderId} open={payOpen} onClose={() => setPayOpen(false)} onSaved={load} />}
    </div>
  );
};
