export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "packing"
  | "dispatched"
  | "installing"
  | "completed"
  | "cancelled";

export type PaymentKind = "advance" | "balance" | "full" | "service";
export type PaymentMethod = "upi" | "neft" | "cash" | "cheque" | "stripe";

export interface PaymentItem {
  id: string;
  orderId: string;
  amountInr: number;
  kind: PaymentKind;
  method: PaymentMethod | null;
  paidAt: string;
  reference: string | null;
  recordedBy: string | null;
}

export interface OrderItem {
  id: string;
  quoteId: string;
  customerId: string;
  enquiryId: string;
  status: OrderStatus;
  systemKw: number;
  systemKind: "on_grid" | "off_grid";
  siteAddress: string;
  scheduledInstallAt: string | null;
  totalInr: number;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  paidInr: number;
  balanceInr: number;
}

export interface OrderDetail extends OrderItem {
  payments: PaymentItem[];
  dispatchIds: string[];
  installationId: string | null;
  leadTechnicianId: string | null;
}

export interface TechnicianOption {
  id: string;
  name: string;
}

export interface ApiList<T> {
  success: true;
  data: T;
  message?: string;
}
