import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { Table } from "../../../components/ui/Table";
import { getPackage, listProducts, updatePackage } from "../catalog.api";
import type { PackageItem, ProductItem } from "../types";

export const PackageDetailPage: React.FC = () => {
  const { packageId = "" } = useParams();
  const [pkg, setPkg] = useState<PackageItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [lines, setLines] = useState<{ productId: string; qty: string }[]>([]);
  const [basePrice, setBasePrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getPackage(packageId), listProducts()])
      .then(([packageRes, productRes]) => {
        if (cancelled) return;
        setPkg(packageRes.data);
        setProducts(productRes.data);
        setBasePrice(String(packageRes.data.basePriceInr));
        setIsActive(packageRes.data.isActive);
        setLines((packageRes.data.items ?? []).map((item) => ({ productId: item.productId, qty: String(item.qty) })));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load package.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [packageId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await updatePackage(packageId, {
        basePriceInr: Number(basePrice),
        isActive,
        items: lines.map((line) => ({ productId: line.productId, qty: Number(line.qty) }))
      });
      setPkg(response.data);
      setMessage("Package saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save package.");
    } finally {
      setSaving(false);
    }
  };

  const nameFor = (productId: string) => products.find((item) => item.id === productId)?.name ?? productId;

  return (
    <div>
      <PageHeader
        title={pkg ? `${pkg.code} · ${pkg.name}` : "Package"}
        description="Bill of materials copied into a quote."
        actions={
          <Link to="/app/catalog" style={{ fontWeight: 600 }}>
            Back to catalog
          </Link>
        }
      />
      <div style={{ padding: "16px var(--layout-gutter)", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
        {isLoading && <p style={{ color: "var(--text-muted)" }}>Loading package...</p>}
        {error && <Alert variant="danger" title="Request failed">{error}</Alert>}
        {message && <Alert variant="success" title="Saved">{message}</Alert>}
        {pkg && (
          <>
            <Input label="Base price (INR)" type="number" min="0" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} />
            <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Active on the public landing page
            </label>
            <Table
              data={lines}
              keyExtractor={(item) => item.productId}
              emptyMessage="No lines."
              columns={[
                { key: "product", header: "Product", render: (item) => nameFor(item.productId) },
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
                        setLines((current) =>
                          current.map((line) => (line.productId === item.productId ? { ...line, qty: event.target.value } : line))
                        )
                      }
                    />
                  )
                }
              ]}
            />
            <Select
              label="Add product"
              value=""
              onChange={(event) => {
                const productId = event.target.value;
                if (!productId || lines.some((line) => line.productId === productId)) return;
                setLines((current) => [...current, { productId, qty: "1" }]);
              }}
              options={[{ value: "", label: "Choose a product" }, ...products.map((item) => ({ value: item.id, label: item.name }))]}
            />
            <Button type="button" onClick={() => void save()} isLoading={saving} disabled={lines.length === 0}>
              Save package
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
