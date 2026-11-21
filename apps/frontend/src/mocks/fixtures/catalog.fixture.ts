import type { PackageItem, ProductItem } from "../../features/catalog/types";

export const productFixture: ProductItem[] = [
  {
    id: "prd-panel330",
    sku: "PNL-330",
    name: "330W Solar Panel",
    category: "panel",
    unit: "pcs",
    unitPriceInr: 6500,
    unitCostInr: 4800,
    isSerialized: true,
    defaultWarrantyMonths: 240,
    isActive: true
  },
  {
    id: "prd-inv3k",
    sku: "INV-3K",
    name: "3kW On-Grid Inverter",
    category: "inverter",
    unit: "pcs",
    unitPriceInr: 28000,
    unitCostInr: 21000,
    isSerialized: true,
    defaultWarrantyMonths: 24,
    isActive: true
  },
  {
    id: "prd-install",
    sku: "SVC-INST",
    name: "Installation and testing",
    category: "service",
    unit: "job",
    unitPriceInr: 15000,
    unitCostInr: 8000,
    isSerialized: false,
    defaultWarrantyMonths: null,
    isActive: true
  }
];

export const packageFixture: PackageItem[] = [
  {
    id: "pkg-og3",
    code: "OG-3KW",
    name: "On-Grid 3 kW System",
    systemKind: "on_grid",
    capacityKw: 3,
    basePriceInr: 185000,
    isActive: true,
    items: [
      { id: "pki-1", packageId: "pkg-og3", productId: "prd-panel330", qty: 10 },
      { id: "pki-2", packageId: "pkg-og3", productId: "prd-inv3k", qty: 1 },
      { id: "pki-3", packageId: "pkg-og3", productId: "prd-install", qty: 1 }
    ]
  }
];
