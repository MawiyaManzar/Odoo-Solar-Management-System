export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitPriceInr: number;
  unitCostInr: number;
  isSerialized: boolean;
  defaultWarrantyMonths: number | null;
  isActive: boolean;
}

export interface PackageItemLine {
  id: string;
  packageId: string;
  productId: string;
  qty: number;
}

export interface PackageItem {
  id: string;
  code: string;
  name: string;
  systemKind: string;
  capacityKw: number | null;
  basePriceInr: number;
  isActive: boolean;
  items?: PackageItemLine[];
}

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  unit?: string;
  unitPriceInr: number;
  unitCostInr?: number;
  isSerialized?: boolean;
  defaultWarrantyMonths?: number | null;
  isActive?: boolean;
}

export interface PackageInput {
  code: string;
  name: string;
  systemKind: string;
  capacityKw?: number | null;
  basePriceInr: number;
  isActive?: boolean;
  items: { productId: string; qty: number }[];
}

export interface PublicEnquiryInput {
  name: string;
  phone: string;
  email?: string;
  addressLine: string;
  city: string;
  pincode?: string;
  customerType?: string;
  requestedKw: number;
  systemKind?: string;
  wantsSubsidy?: boolean;
  notes?: string;
}
