export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "packing"
  | "dispatched"
  | "installing"
  | "completed"
  | "cancelled";

export type ServiceTicketStatus = "open" | "in_progress" | "waiting_parts" | "resolved" | "closed";

export interface JobMarginItem {
  orderId: string;
  customerName: string;
  revenueInr: number;
  cogsEstimateInr: number;
  grossMarginInr: number;
  status: OrderStatus;
  completedAt: string | null;
}

export interface ServiceTicketItem {
  id: string;
  customerId: string;
  orderId: string | null;
  serialUnitId: string | null;
  openedBy: string | null;
  assignedTo: string | null;
  faultCode: string | null;
  description: string;
  underWarranty: boolean | null;
  billableInr: number;
  status: ServiceTicketStatus;
  resolvedAt: string | null;
  customerConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiList<T> {
  success: true;
  data: T;
  message?: string;
}

export const OPEN_TICKET_STATUSES: ServiceTicketStatus[] = ["open", "in_progress", "waiting_parts"];
