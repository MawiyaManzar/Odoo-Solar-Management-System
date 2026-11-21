import { apiClient } from "../../lib/api-client";
import type { ApiList, DispatchItem, DispatchStatus, SerialItem, StockItem } from "./types";

export function listStock() {
  return apiClient.get<ApiList<StockItem[]>>("/stock");
}

export function listDispatches(status?: DispatchStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<ApiList<DispatchItem[]>>(`/dispatches${query}`);
}

export function getDispatch(id: string) {
  return apiClient.get<ApiList<DispatchItem>>(`/dispatches/${id}`);
}

export function createDispatch(body: { orderId: string; vehicleNotes?: string }) {
  return apiClient.post<ApiList<DispatchItem>>("/dispatches", body);
}

export function markInTransit(id: string) {
  return apiClient.post<ApiList<DispatchItem>>(`/dispatches/${id}/in-transit`);
}

export function deliverDispatch(id: string) {
  return apiClient.post<ApiList<DispatchItem>>(`/dispatches/${id}/deliver`);
}

export function createSerial(body: { productId: string; serialNumber: string }) {
  return apiClient.post<ApiList<SerialItem>>("/serial-units", body);
}

export function findSerial(serialNumber: string) {
  return apiClient.get<ApiList<SerialItem[]>>(`/serial-units?serialNumber=${encodeURIComponent(serialNumber)}`);
}

export function scanOut(serialId: string, body: { orderId: string; dispatchId: string }) {
  return apiClient.post<ApiList<SerialItem>>(`/serial-units/${serialId}/scan-out`, body);
}

export function listDispatchSerials(dispatchId: string) {
  return apiClient.get<ApiList<SerialItem[]>>(`/serial-units?dispatchId=${encodeURIComponent(dispatchId)}`);
}

export function listPaidOrders() {
  return apiClient.get<ApiList<Array<{ id: string; customerName: string; siteAddress: string }>>>("/orders?status=paid");
}
