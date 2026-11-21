export type DispatchStatus = "packing" | "in_transit" | "delivered" | "cancelled";
export type SerialStatus = "in_stock" | "reserved" | "dispatched" | "installed" | "returned" | "scrapped";

export interface StockItem {
  id: string;
  productId: string;
  qtyOnHand: number;
  qtyReserved: number;
  updatedAt: string;
  productSku: string;
  productName: string;
  available: number;
}

export interface SerialItem {
  id: string;
  productId: string;
  serialNumber: string;
  status: SerialStatus;
  orderId: string | null;
  dispatchId: string | null;
  deliveredAt: string | null;
  createdAt: string;
  productName: string;
  productSku: string;
}

export interface DispatchItem {
  id: string;
  orderId: string;
  status: DispatchStatus;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  packedBy: string | null;
  vehicleNotes: string | null;
  createdAt: string;
  serialUnitIds?: string[];
  customerName: string;
  serials?: SerialItem[];
}

export interface PaidOrderOption {
  id: string;
  customerName: string;
  siteAddress: string;
}

export interface ApiList<T> {
  success: true;
  data: T;
  message?: string;
}
