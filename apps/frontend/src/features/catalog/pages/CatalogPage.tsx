import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { Table } from "../../../components/ui/Table";
import { createPackage, createProduct, updateProduct } from "../catalog.api";
import { useCatalog } from "../hooks/useCatalog";
import type { ProductItem } from "../types";

const CATEGORIES = ["panel", "inverter", "battery", "charge_controller", "mount", "wiring", "safety", "service"];
const KINDS = ["on_grid", "off_grid", "panel_set", "installation_only"];

type ProductFormState = {
  sku: string;
  name: string;
  category: string;
  price: string;
  cost: string;
  warrantyMonths: string;
  isSerialized: boolean;
  isActive: boolean;
};

const emptyProductForm = (): ProductFormState => ({
  sku: "",
  name: "",
  category: "panel",
  price: "",
  cost: "0",
  warrantyMonths: "",
  isSerialized: false,
  isActive: true
});

function formFromProduct(product: ProductItem): ProductFormState {
  return {
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: String(product.unitPriceInr),
    cost: String(product.unitCostInr),
    warrantyMonths: product.defaultWarrantyMonths == null ? "" : String(product.defaultWarrantyMonths),
    isSerialized: product.isSerialized,
    isActive: product.isActive
  };
}

function parseWarrantyMonths(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (Number.isNaN(value) || value < 1 || !Number.isInteger(value)) {
    throw new Error("Warranty must be a whole number of months, or left blank.");
  }
  return value;
}

export const CatalogPage: React.FC = () => {
  const { products, packages, isLoading, error, refetch } = useCatalog();
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [packageOpen, setPackageOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);

  const [packageName, setPackageName] = useState("");
  const [systemKind, setSystemKind] = useState("on_grid");
  const [capacityKw, setCapacityKw] = useState("3");
  const [basePrice, setBasePrice] = useState("");
  const [packageLines, setPackageLines] = useState<{ productId: string; qty: string }[]>([]);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm());
    setFormError(null);
    setProductOpen(true);
  };

  const openEditProduct = (product: ProductItem) => {
    setEditingProduct(product);
    setProductForm(formFromProduct(product));
    setFormError(null);
    setProductOpen(true);
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const warrantyMonths = parseWarrantyMonths(productForm.warrantyMonths);
      const payload = {
        sku: productForm.sku.trim(),
        name: productForm.name.trim(),
        category: productForm.category,
        unitPriceInr: Number(productForm.price),
        unitCostInr: Number(productForm.cost),
        defaultWarrantyMonths: warrantyMonths,
        isSerialized: productForm.isSerialized,
        isActive: productForm.isActive
      };
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }
      setProductOpen(false);
      setEditingProduct(null);
      setProductForm(emptyProductForm());
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const openCreatePackage = () => {
    setPackageName("");
    setSystemKind("on_grid");
    setCapacityKw("3");
    setBasePrice("");
    setPackageLines([]);
    setFormError(null);
    setPackageOpen(true);
  };

  const productName = (productId: string) =>
    products.find((item) => item.id === productId)?.name ?? productId;

  const savePackage = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (packageLines.length === 0) {
        throw new Error("Add at least one product to the package.");
      }
      await createPackage({
        name: packageName.trim(),
        systemKind,
        capacityKw: capacityKw ? Number(capacityKw) : null,
        basePriceInr: Number(basePrice),
        items: packageLines.map((line) => ({ productId: line.productId, qty: Number(line.qty) }))
      });
      setPackageOpen(false);
      setPackageLines([]);
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
            <Button variant="secondary" size="sm" onClick={openCreateProduct}>
              New product
            </Button>
            <Button size="sm" onClick={openCreatePackage}>
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
              { key: "warranty", header: "Warranty (months)", render: (item) => item.defaultWarrantyMonths ?? "—" },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (item) => (
                  <Button variant="outline" size="sm" onClick={() => openEditProduct(item)}>
                    Edit
                  </Button>
                )
              }
            ]}
          />
        </>
      )}

      <Dialog
        open={productOpen}
        title={editingProduct ? "Edit product" : "New product"}
        onClose={() => {
          setProductOpen(false);
          setEditingProduct(null);
        }}
      >
        <form onSubmit={saveProduct} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {formError && <Alert variant="danger" title="Save failed">{formError}</Alert>}
          <Input
            label="SKU"
            required
            value={productForm.sku}
            onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
          />
          <Input
            label="Name"
            required
            value={productForm.name}
            onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Select
            label="Category"
            value={productForm.category}
            onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
            options={CATEGORIES.map((value) => ({ value, label: value.replace(/_/g, " ") }))}
          />
          <Input
            label="Unit price (INR)"
            required
            type="number"
            min="0"
            value={productForm.price}
            onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
          />
          <Input
            label="Unit cost (INR)"
            type="number"
            min="0"
            value={productForm.cost}
            onChange={(event) => setProductForm((prev) => ({ ...prev, cost: event.target.value }))}
          />
          <Input
            label="Warranty (months)"
            type="number"
            min="1"
            step="1"
            value={productForm.warrantyMonths}
            helperText="Leave blank for no default warranty. Used when a serial is delivered."
            onChange={(event) => setProductForm((prev) => ({ ...prev, warrantyMonths: event.target.value }))}
          />
          <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "var(--text-base, 15px)" }}>
            <input
              type="checkbox"
              checked={productForm.isSerialized}
              onChange={(event) => setProductForm((prev) => ({ ...prev, isSerialized: event.target.checked }))}
            />
            Serialized (panels, inverters, batteries)
          </label>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "var(--text-base, 15px)" }}>
            <input
              type="checkbox"
              checked={productForm.isActive}
              onChange={(event) => setProductForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active in catalog
          </label>
          <Button type="submit" isLoading={saving}>
            {editingProduct ? "Save changes" : "Save product"}
          </Button>
        </form>
      </Dialog>

      <Dialog open={packageOpen} title="New package" onClose={() => setPackageOpen(false)}>
        <form onSubmit={savePackage} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {formError && <Alert variant="danger" title="Save failed">{formError}</Alert>}
          <Input label="Name" required value={packageName} onChange={(event) => setPackageName(event.target.value)} />
          <Select label="Kind" value={systemKind} onChange={(event) => setSystemKind(event.target.value)} options={KINDS.map((value) => ({ value, label: value.replace(/_/g, " ") }))} />
          <Input label="kW" type="number" min="0" step="0.1" value={capacityKw} onChange={(event) => setCapacityKw(event.target.value)} helperText="Code is assigned automatically from kind and kW (e.g. OG-3KW)." />
          <Input label="Base price (INR)" required type="number" min="0" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} />
          {packageLines.length > 0 && (
            <Table
              data={packageLines}
              keyExtractor={(item) => item.productId}
              emptyMessage="No products yet."
              columns={[
                { key: "product", header: "Product", render: (item) => productName(item.productId) },
                {
                  key: "qty",
                  header: "Qty",
                  render: (item) => (
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.qty}
                      onChange={(event) =>
                        setPackageLines((current) =>
                          current.map((line) =>
                            line.productId === item.productId ? { ...line, qty: event.target.value } : line
                          )
                        )
                      }
                    />
                  )
                },
                {
                  key: "remove",
                  header: "",
                  align: "right",
                  render: (item) => (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPackageLines((current) => current.filter((line) => line.productId !== item.productId))
                      }
                    >
                      Remove
                    </Button>
                  )
                }
              ]}
            />
          )}
          <Select
            label="Add product"
            value=""
            onChange={(event) => {
              const productId = event.target.value;
              if (!productId || packageLines.some((line) => line.productId === productId)) return;
              setPackageLines((current) => [...current, { productId, qty: "1" }]);
            }}
            options={[
              { value: "", label: "Choose a product" },
              ...products.map((item) => ({ value: item.id, label: `${item.sku} · ${item.name}` }))
            ]}
          />
          <Button type="submit" isLoading={saving} disabled={products.length === 0 || packageLines.length === 0}>
            Save package
          </Button>
        </form>
      </Dialog>
    </div>
  );
};
