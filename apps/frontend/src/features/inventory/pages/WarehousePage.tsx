import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { formatWhen, labelStatus, orderStatusVariant } from "../../orders/status";
import { AddSerialDialog } from "../components/AddSerialDialog";
import { createDispatch, listDispatches, listPaidOrders, listStock } from "../inventory.api";
import type { DispatchItem, DispatchStatus, StockItem } from "../types";

const FILTERS: Array<"" | DispatchStatus> = ["", "packing", "in_transit", "delivered", "cancelled"];

export const WarehousePage: React.FC = () => {
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "warehouse";
  const [status, setStatus] = useState<"" | DispatchStatus>("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [rows, setRows] = useState<DispatchItem[]>([]);
  const [paid, setPaid] = useState<Array<{ id: string; customerName: string; siteAddress: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [serialOpen, setSerialOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = (next: "" | DispatchStatus = status) => {
    setIsLoading(true);
    setError(null);
    Promise.all([listStock(), listDispatches(next || undefined), listPaidOrders()])
      .then(([stockResponse, dispatchResponse, paidResponse]) => {
        setStock(stockResponse.data);
        setRows(dispatchResponse.data);
        setPaid(paidResponse.data);
        setOrderId((current) => current || paidResponse.data[0]?.id || "");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load warehouse."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const create = () => {
    if (!orderId) {
      setFormError("Choose a paid order.");
      return;
    }
    setSaving(true);
    setFormError(null);
    createDispatch({ orderId, vehicleNotes: notes.trim() || undefined })
      .then(() => {
        setOpen(false);
        setNotes("");
        load();
      })
      .catch((err: unknown) => setFormError(err instanceof Error ? err.message : "Could not create dispatch."))
      .finally(() => setSaving(false));
  };

  return (
    <div>
      <PageHeader
        title="Warehouse"
        description="Stock on hand, then dispatches."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => load()} isLoading={isLoading}>
              Refresh
            </Button>
            {canWrite && (
              <>
                <Button size="sm" variant="outline" onClick={() => setSerialOpen(true)}>
                  Add serial
                </Button>
                <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
                  New dispatch
                </Button>
              </>
            )}
          </>
        }
      />
      {error && (
        <div style={{ padding: "0 var(--layout-gutter) 12px" }}>
          <Alert variant="danger" title="Request failed">
            {error}
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={() => load()}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}
      {isLoading && <SkeletonRows testId="warehouse-skeleton" />}
      {!isLoading && !error && stock.length === 0 && rows.length === 0 && (
        <div data-testid="warehouse-empty" style={{ padding: "32px var(--layout-gutter)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>Nothing to pack</h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>Stock and dispatches show up here once products and paid orders exist.</p>
        </div>
      )}
      {!isLoading && !error && (stock.length > 0 || rows.length > 0) && (
        <>
          <h2 style={{ margin: "0", padding: "8px var(--layout-gutter)", fontSize: "1.05rem" }}>Stock</h2>
          <Table
            data={stock}
            keyExtractor={(item) => item.id}
            emptyMessage="No stock rows."
            columns={[
              { key: "sku", header: "SKU", render: (item) => item.productSku },
              { key: "name", header: "Product", render: (item) => item.productName },
              { key: "on", header: "On hand", align: "right", render: (item) => String(item.qtyOnHand) },
              { key: "res", header: "Reserved", align: "right", render: (item) => String(item.qtyReserved) },
              { key: "av", header: "Available", align: "right", render: (item) => String(item.available) }
            ]}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "16px var(--layout-gutter) 8px" }}>
            {FILTERS.map((value) => (
              <Button key={value || "all"} size="sm" variant={status === value ? "primary" : "outline"} onClick={() => setStatus(value)}>
                {value ? labelStatus(value) : "All dispatches"}
              </Button>
            ))}
          </div>
          {rows.length === 0 ? (
            <div data-testid="dispatches-empty" style={{ padding: "24px var(--layout-gutter)", color: "var(--text-muted)" }}>
              No dispatches in this status.
            </div>
          ) : (
            <Table
              data={rows}
              keyExtractor={(item) => item.id}
              columns={[
                { key: "id", header: "Dispatch", render: (item) => <Link to={`/app/dispatches/${item.id}`}>{item.id}</Link> },
                { key: "order", header: "Order", render: (item) => item.orderId },
                { key: "customer", header: "Customer", render: (item) => item.customerName },
                {
                  key: "status",
                  header: "Status",
                  render: (item) => <Badge variant={orderStatusVariant(item.status)}>{labelStatus(item.status)}</Badge>
                },
                { key: "packed", header: "Packed by", render: (item) => item.packedBy ?? "—" },
                { key: "left", header: "Left at", render: (item) => formatWhen(item.dispatchedAt) }
              ]}
            />
          )}
        </>
      )}
      <AddSerialDialog open={serialOpen} onClose={() => setSerialOpen(false)} onSaved={() => load()} />
      <Dialog open={open} title="New dispatch" onClose={() => setOpen(false)}>
        <div style={{ display: "grid", gap: "12px" }}>
          <Select
            label="Paid order"
            value={orderId}
            options={paid.map((order) => ({ value: order.id, label: `${order.id} · ${order.customerName}` }))}
            onChange={(event) => setOrderId(event.target.value)}
          />
          <Input label="Vehicle notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          {paid.length === 0 && <p style={{ margin: 0, color: "var(--text-muted)" }}>No paid orders are waiting to pack.</p>}
          {formError && <p style={{ margin: 0, color: "var(--danger-text)" }}>{formError}</p>}
          <Button variant="primary" onClick={create} isLoading={saving} disabled={paid.length === 0}>
            Create dispatch
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
