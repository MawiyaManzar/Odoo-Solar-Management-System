/** Demo story: Amit Verma, Jalandhar — 3 kW on-grid through completed install + sample serials. */

export const sunpowerCustomer = {
  id: "cus-01",
  name: "Amit Verma",
  phone: 9876543210,
  email: "amit.verma@example.com",
  addressLine: "12 Model Town",
  city: "Jalandhar",
  pincode: "144001",
  customerType: "residential" as const
};

export const sunpowerProducts = [
  {
    id: "prd-panel330",
    sku: "PNL-330",
    name: "330W Solar Panel",
    category: "panel" as const,
    unitPriceInr: 6500,
    unitCostInr: 4800,
    isSerialized: true,
    defaultWarrantyMonths: 240
  },
  {
    id: "prd-inv3k",
    sku: "INV-3K",
    name: "3kW On-Grid Inverter",
    category: "inverter" as const,
    unitPriceInr: 28000,
    unitCostInr: 21000,
    isSerialized: true,
    defaultWarrantyMonths: 24
  },
  {
    id: "prd-mount",
    sku: "MNT-SET",
    name: "Roof Mount Stand Set",
    category: "mount" as const,
    unitPriceInr: 12000,
    unitCostInr: 7500,
    isSerialized: false,
    defaultWarrantyMonths: 60
  },
  {
    id: "prd-wiring",
    sku: "WR-KIT",
    name: "DC/AC Wiring & Switch Kit",
    category: "wiring" as const,
    unitPriceInr: 8500,
    unitCostInr: 5200,
    isSerialized: false,
    defaultWarrantyMonths: 12
  },
  {
    id: "prd-safety",
    sku: "SF-EARTH",
    name: "Earthing & Safety Pack",
    category: "safety" as const,
    unitPriceInr: 4500,
    unitCostInr: 2800,
    isSerialized: false,
    defaultWarrantyMonths: 12
  },
  {
    id: "prd-install",
    sku: "SVC-INST",
    name: "Installation & testing",
    category: "service" as const,
    unitPriceInr: 15000,
    unitCostInr: 8000,
    isSerialized: false,
    defaultWarrantyMonths: null as number | null
  }
];

export const sunpowerPackage = {
  id: "pkg-og3",
  code: "OG-3KW",
  name: "On-Grid 3 kW System",
  systemKind: "on_grid" as const,
  capacityKw: 3,
  basePriceInr: 185000
};

export const sunpowerPackageItems = [
  { id: "pki-1", packageId: "pkg-og3", productId: "prd-panel330", qty: 10 },
  { id: "pki-2", packageId: "pkg-og3", productId: "prd-inv3k", qty: 1 },
  { id: "pki-3", packageId: "pkg-og3", productId: "prd-mount", qty: 1 },
  { id: "pki-4", packageId: "pkg-og3", productId: "prd-wiring", qty: 1 },
  { id: "pki-5", packageId: "pkg-og3", productId: "prd-safety", qty: 1 },
  { id: "pki-6", packageId: "pkg-og3", productId: "prd-install", qty: 1 }
];

export const sunpowerEnquiry = {
  id: "enq-01",
  customerId: "cus-01",
  source: "web_form" as const,
  requestedKw: 3,
  systemKind: "on_grid" as const,
  wantsSubsidy: true,
  monthlyBillInr: 4500,
  roofAreaSqft: 420,
  gridSuitable: true,
  status: "won" as const,
  assignedTo: "usr-sales-01",
  notes: "Subsidy interest; Model Town south-facing roof."
};

export const sunpowerSurvey = {
  id: "sur-01",
  enquiryId: "enq-01",
  technicianId: "usr-tech-01",
  roofDirection: "south",
  tiltDegrees: 18,
  cableDistanceM: 12.5,
  usableAreaSqft: 380,
  shadowNotes: "Minor chimney shade mornings only.",
  result: "approved" as const
};

export const sunpowerQuote = {
  id: "quo-01",
  enquiryId: "enq-01",
  customerId: "cus-01",
  packageId: "pkg-og3",
  status: "accepted" as const,
  subtotalInr: 185000,
  discountInr: 0,
  totalInr: 185000,
  createdBy: "usr-sales-01"
};

export const sunpowerQuoteLines = sunpowerPackageItems.map((item, index) => {
  const product = sunpowerProducts.find((p) => p.id === item.productId)!;
  return {
    id: `ql-${index + 1}`,
    quoteId: "quo-01",
    productId: item.productId,
    description: product.name,
    qty: item.qty,
    unitPriceInr: product.unitPriceInr,
    lineTotalInr: item.qty * product.unitPriceInr
  };
});

export const sunpowerOrder = {
  id: "ord-01",
  quoteId: "quo-01",
  customerId: "cus-01",
  enquiryId: "enq-01",
  status: "completed" as const,
  systemKw: 3,
  systemKind: "on_grid" as const,
  siteAddress: "12 Model Town, Jalandhar 144001",
  totalInr: 185000
};

export const sunpowerPayments = [
  {
    id: "pay-01",
    orderId: "ord-01",
    amountInr: 92500,
    kind: "advance" as const,
    method: "upi" as const,
    reference: "UTR-DEMO-001",
    recordedBy: "usr-sales-01"
  },
  {
    id: "pay-02",
    orderId: "ord-01",
    amountInr: 92500,
    kind: "balance" as const,
    method: "neft" as const,
    reference: "NEFT-DEMO-002",
    recordedBy: "usr-sales-01"
  }
];

export const sunpowerStockLevels = sunpowerProducts
  .filter((p) => p.category !== "service")
  .map((p, index) => ({
    id: `stk-${index + 1}`,
    productId: p.id,
    qtyOnHand: p.isSerialized ? 20 : 50,
    qtyReserved: 0
  }));

export const sunpowerSerialUnits = [
  {
    id: "ser-inv-01",
    productId: "prd-inv3k",
    serialNumber: "INV-3K-88421",
    status: "installed" as const,
    orderId: "ord-01",
    dispatchId: "dsp-01"
  },
  {
    id: "ser-pnl-01",
    productId: "prd-panel330",
    serialNumber: "PNL-330-10001",
    status: "installed" as const,
    orderId: "ord-01",
    dispatchId: "dsp-01"
  },
  {
    id: "ser-inv-stock",
    productId: "prd-inv3k",
    serialNumber: "INV-3K-90001",
    status: "in_stock" as const,
    orderId: null as string | null,
    dispatchId: null as string | null
  }
];

export const sunpowerDispatch = {
  id: "dsp-01",
  orderId: "ord-01",
  status: "delivered" as const,
  packedBy: "usr-warehouse-01",
  vehicleNotes: "Tata Ace — Model Town route"
};

export const sunpowerInstallation = {
  id: "ins-01",
  orderId: "ord-01",
  leadTechnicianId: "usr-tech-01",
  systemKwConfirmed: 3,
  generationTestOk: true,
  status: "completed" as const,
  notes: "Homeowner signed on tablet."
};

export const sunpowerWarrantyPolicies = [
  {
    id: "wpol-panel",
    productId: "prd-panel330",
    category: "panel",
    name: "Panel performance 20y",
    durationMonths: 240
  },
  {
    id: "wpol-inverter",
    productId: "prd-inv3k",
    category: "inverter",
    name: "Inverter standard 2y",
    durationMonths: 24
  }
];
