import { apiClient } from "../../lib/api-client";
import type { ApiList, OrderDetail, OrderItem, OrderStatus, PaymentItem, PaymentKind, PaymentMethod, TechnicianOption } from "./types";

export function listOrders(status?: OrderStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<ApiList<OrderItem[]>>(`/orders${query}`);
}

export function getOrder(id: string) {
  return apiClient.get<ApiList<OrderDetail>>(`/orders/${id}`);
}

export function listTechnicians() {
  return apiClient.get<ApiList<TechnicianOption[]>>("/staff?role=technician");
}

export function recordPayment(
  orderId: string,
  body: { amountInr: number; kind: PaymentKind; method?: PaymentMethod; reference?: string }
) {
  return apiClient.post<ApiList<PaymentItem>>(`/orders/${orderId}/payments`, body);
}

export function scheduleOrder(orderId: string, body: { scheduledInstallAt: string; leadTechnicianId: string }) {
  return apiClient.post<ApiList<OrderDetail>>(`/orders/${orderId}/schedule`, body);
}

export function cancelOrder(orderId: string) {
  return apiClient.patch<ApiList<OrderDetail>>(`/orders/${orderId}`, { status: "cancelled" });
}
