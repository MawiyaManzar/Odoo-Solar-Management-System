import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { listProducts } from "../../catalog/catalog.api";
import type { ProductItem } from "../../catalog/types";
import { createSerial } from "../inventory.api";

export const AddSerialDialog: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({
  open,
  onClose,
  onSaved
}) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productId, setProductId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingProducts(true);
    setError(null);
    listProducts()
      .then((response) => {
        const serialized = response.data.filter((product) => product.isSerialized && product.isActive);
        setProducts(serialized);
        setProductId((current) => current || serialized[0]?.id || "");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load products."))
      .finally(() => setLoadingProducts(false));
  }, [open]);

  const submit = () => {
    if (!productId) {
      setError("Choose a serialized product.");
      return;
    }
    if (!serialNumber.trim()) {
      setError("Serial number is required.");
      return;
    }
    setSaving(true);
    setError(null);
    createSerial({ productId, serialNumber: serialNumber.trim() })
      .then(() => {
        setSerialNumber("");
        onSaved();
        onClose();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not add the serial."))
      .finally(() => setSaving(false));
  };

  return (
    <Dialog open={open} title="Add serial" onClose={onClose}>
      <div style={{ display: "grid", gap: "12px" }}>
        <Select
          label="Product"
          value={productId}
          disabled={loadingProducts || products.length === 0}
          options={products.map((product) => ({ value: product.id, label: `${product.sku} · ${product.name}` }))}
          onChange={(event) => setProductId(event.target.value)}
        />
        <Input label="Serial number" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} required />
        {products.length === 0 && !loadingProducts && (
          <p style={{ margin: 0, color: "var(--text-muted)" }}>No serialized products are active. Panels, inverters, batteries, and charge controllers can take a serial.</p>
        )}
        {error && <p style={{ margin: 0, color: "var(--danger-text)" }}>{error}</p>}
        <Button variant="primary" onClick={submit} isLoading={saving} disabled={products.length === 0}>
          Add to stock
        </Button>
      </div>
    </Dialog>
  );
};
