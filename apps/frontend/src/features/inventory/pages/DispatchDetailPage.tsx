import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { formatWhen, labelStatus, orderStatusVariant } from "../../orders/status";
import { AddSerialDialog } from "../components/AddSerialDialog";
import { deliverDispatch, findSerial, getDispatch, listDispatchSerials, markInTransit, scanOut } from "../inventory.api";
import type { DispatchItem, SerialItem } from "../types";

export const DispatchDetailPage: React.FC = () => {
  const { dispatchId = "" } = useParams();
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "warehouse";
  const [dispatch, setDispatch] = useState<DispatchItem | null>(null);
  const [serials, setSerials] = useState<SerialItem[]>([]);
  const [serialNumber, setSerialNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serialOpen, setSerialOpen] = useState(false);

  const load = () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    getDispatch(dispatchId)
      .then(async (response) => {
        setDispatch(response.data);
        const listed = await listDispatchSerials(response.data.id);
        setSerials(listed.data);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Could not load dispatch.";
        if (message.toLowerCase().includes("not found")) setNotFound(true);
        setError(message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchId]);

  const scan = () => {
    if (!dispatch || !serialNumber.trim()) return;
    setSaving(true);
    setScanError(null);
    findSerial(serialNumber.trim())
      .then((found) => {
        const match = found.data[0];
        if (!match) throw new Error("Serial not in stock.");
        return scanOut(match.id, { orderId: dispatch.orderId, dispatchId: dispatch.id });
      })
      .then(() => {
        setSerialNumber("");
        load();
      })
      .catch((err: unknown) => setScanError(err instanceof Error ? err.message : "Serial not in stock."))
      .finally(() => setSaving(false));
  };

  const move = (action: "transit" | "deliver") => {
    setSaving(true);
    setScanError(null);
    const request = action === "transit" ? markInTransit(dispatchId) : deliverDispatch(dispatchId);
    request
      .then((response) => {
        setDispatch(response.data);
        return listDispatchSerials(response.data.id);
      })
      .then((listed) => setSerials(listed.data))
      .catch((err: unknown) => setScanError(err instanceof Error ? err.message : "Could not update dispatch."))
      .finally(() => setSaving(false));
  };

  const closed = dispatch?.status === "delivered" || dispatch?.status === "cancelled";

  return (
    <div>
      <PageHeader
        title={dispatch ? `Dispatch ${dispatch.id}` : "Dispatch"}
        description={dispatch ? `${dispatch.orderId} · ${dispatch.customerName}` : "Scan serials before the truck leaves."}
        actions={
          <Link to="/app/warehouse">
            <Button variant="secondary" size="sm">
              Back to warehouse
            </Button>
          </Link>
        }
      />
      {isLoading && <SkeletonRows testId="dispatch-detail-skeleton" />}
      {!isLoading && notFound && (
        <div style={{ padding: "0 var(--layout-gutter)" }}>
          <Alert variant="danger" title="Not found">
            This dispatch does not exist.
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
      {!isLoading && dispatch && (
        <div style={{ display: "grid", gap: "16px", padding: "0 var(--layout-gutter) 32px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Badge variant={orderStatusVariant(dispatch.status)}>{labelStatus(dispatch.status)}</Badge>
            <span>{dispatch.vehicleNotes ?? "No vehicle notes"}</span>
          </div>
          {dispatch.status === "delivered" && (
            <Alert variant="success" title="Delivered">
              Warranty starts from this delivery. Delivered {formatWhen(dispatch.deliveredAt)}.
            </Alert>
          )}
          {canWrite && !closed && (
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => setSerialOpen(true)}>
                Add serial
              </Button>
            </div>
          )}
          {canWrite && !closed && (
            <form
              style={{ display: "flex", gap: "8px", alignItems: "flex-end", maxWidth: "520px" }}
              onSubmit={(event) => {
                event.preventDefault();
                scan();
              }}
            >
              <Input label="Serial number" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
              <Button type="submit" variant="primary" isLoading={saving}>
                Scan
              </Button>
            </form>
          )}
          {scanError && (
            <Alert variant="danger" title="Scan failed">
              {scanError}
            </Alert>
          )}
          <Table
            data={serials}
            keyExtractor={(item) => item.id}
            emptyMessage="No serials scanned yet."
            columns={[
              { key: "serial", header: "Serial", render: (item) => item.serialNumber },
              { key: "product", header: "Product", render: (item) => item.productName },
              { key: "status", header: "Status", render: (item) => labelStatus(item.status) }
            ]}
          />
          {canWrite && !closed && (
            <div style={{ display: "flex", gap: "8px" }}>
              {dispatch.status === "packing" && (
                <Button variant="outline" onClick={() => move("transit")} disabled={saving}>
                  Mark in transit
                </Button>
              )}
              <Button variant="primary" onClick={() => move("deliver")} disabled={saving}>
                Mark delivered
              </Button>
            </div>
          )}
        </div>
      )}
      <AddSerialDialog open={serialOpen} onClose={() => setSerialOpen(false)} onSaved={load} />
    </div>
  );
};
