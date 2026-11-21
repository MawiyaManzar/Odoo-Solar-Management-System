import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { Table } from "../../../components/ui/Table";
import { createPackage, createProduct } from "../catalog.api";
import { useCatalog } from "../hooks/useCatalog";

const CATEGORIES = ["panel", "inverter", "battery", "charge_controller", "mount", "wiring", "safety", "service"];
const KINDS = ["on_grid", "off_grid", "panel_set", "installation_only"];

export const CatalogPage: React.FC = () => {
  const { products, packages, isLoading, error, refetch } = useCatalog();
  const [productOpen, setProductOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("panel");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("0");

  const [code, setCode] = useState("");
  const [packageName, setPackageName] = useState("");
  const [systemKind, setSystemKind] = useState("on_grid");
  const [capacityKw, setCapacityKw] = useState("3");
  const [basePrice, setBasePrice] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createProduct({
        sku,
        name: productName,
        category,
        unitPriceInr: Number(price),
        unitCostInr: Number(cost)
      });
      setProductOpen(false);
      setSku("");
      setProductName("");
      setPrice("");
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const savePackage = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createPackage({
        code,
        name: packageName,
        systemKind,
        capacityKw: capacityKw ? Number(capacityKw) : null,
        basePriceInr: Number(basePrice),
        items: [{ productId: productId || products[0]?.id, qty: Number(qty) }]
      });
      setPackageOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save package.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Packages and parts quotes are built from."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void refetch()} isLoading={isLoading}>
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setFormError(null); setProductOpen(true); }}>
              New product
            </Button>
            <Button size="sm" onClick={() => { setFormError(null); setProductId(products[0]?.id ?? ""); setPackageOpen(true); }}>
              New package
            </Button>
          </>
        }
      />
      {error && (
        <div style={{ padding: "16px var(--layout-gutter)" }}>
          <Alert variant="danger" title="Request failed">{error.message}</Alert>
        </div>
      )}
      {isLoading && <p style={{ padding: "24px var(--layout-gutter)", color: "var(--text-muted)" }}>Loading catalog...</p>}
      {!isLoading && !error && (
        <>
          <h3 style={{ margin: 0, padding: "16px var(--layout-gutter) 8px" }}>Packages</h3>
          <Table
            data={packages}
            keyExtractor={(item) => item.id}
            emptyMessage="No packages yet."
            columns={[
              { key: "code", header: "Code", render: (item) => <Link to={`/app/catalog/${item.id}`}>{item.code}</Link> },
              { key: "name", header: "Name", render: (item) => item.name },
              { key: "kind", header: "Kind", render: (item) => item.systemKind.replace(/_/g, " ") },
              { key: "kw", header: "kW", render: (item) => (item.capacityKw == null ? "—" : String(item.capacityKw)) },
              { key: "price", header: "Base price", align: "right", render: (item) => item.basePriceInr.toLocaleString("en-IN") },
              { key: "active", header: "Active", render: (item) => (item.isActive ? "Yes" : "No") }
            ]}
          />
          <h3 style={{ margin: 0, padding: "24px var(--layout-gutter) 8px" }}>Products</h3>
          <Table
            data={products}
            keyExtractor={(item) => item.id}
            emptyMessage="No products yet."
            columns={[
              { key: "sku", header: "SKU", render: (item) => item.sku },
              { key: "name", header: "Name", render: (item) => item.name },
              { key: "category", header: "Category", render: (item) => item.category.replace(/_/g, " ") },
              { key: "price", header: "Price", align: "right", render: (item) => item.unitPriceInr.toLocaleString("en-IN") },
              { key: "cost", header: "Cost", align: "right", render: (item) => item.unitCostInr.toLocaleString("en-IN") },
              { key: "serial", header: "Serialized", render: (item) => (item.isSerialized ? "Yes" : "No") },
              { key: "warranty", header: "Warranty (months)", render: (item) => item.defaultWarrantyMonths ?? "—" }
            ]}
          />
        </>
      )}

      <Dialog open={productOpen} title="New product" onClose={() => setProductOpen(false)}>
        <form onSubmit={saveProduct} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {formError && <Alert variant="danger" title="Save failed">{formError}</Alert>}
          <Input label="SKU" required value={sku} onChange={(event) => setSku(event.target.value)} />
          <Input label="Name" required value={productName} onChange={(event) => setProductName(event.target.value)} />
          <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)} options={CATEGORIES.map((value) => ({ value, label: value.replace(/_/g, " ") }))} />
          <Input label="Unit price (INR)" required type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} />
          <Input label="Unit cost (INR)" type="number" min="0" value={cost} onChange={(event) => setCost(event.target.value)} />
          <Button type="submit" isLoading={saving}>Save product</Button>
        </form>
      </Dialog>

      <Dialog open={packageOpen} title="New package" onClose={() => setPackageOpen(false)}>
        <form onSubmit={savePackage} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {formError && <Alert variant="danger" title="Save failed">{formError}</Alert>}
          <Input label="Code" required value={code} onChange={(event) => setCode(event.target.value)} />
          <Input label="Name" required value={packageName} onChange={(event) => setPackageName(event.target.value)} />
          <Select label="Kind" value={systemKind} onChange={(event) => setSystemKind(event.target.value)} options={KINDS.map((value) => ({ value, label: value.replace(/_/g, " ") }))} />
          <Input label="kW" type="number" min="0" step="0.1" value={capacityKw} onChange={(event) => setCapacityKw(event.target.value)} />
          <Input label="Base price (INR)" required type="number" min="0" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} />
          <Select
            label="First line product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            options={products.map((item) => ({ value: item.id, label: `${item.sku} · ${item.name}` }))}
          />
          <Input label="Qty" type="number" min="0.01" step="0.01" value={qty} onChange={(event) => setQty(event.target.value)} />
          <Button type="submit" isLoading={saving} disabled={products.length === 0}>Save package</Button>
        </form>
      </Dialog>
    </div>
  );
};
