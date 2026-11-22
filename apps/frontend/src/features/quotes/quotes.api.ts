import { apiClient } from "../../lib/api-client";
import type { ApiResponse } from "../../types/api";
import type { QuoteItem } from "./types";

export function listQuotes(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<ApiResponse<QuoteItem[]>>(`/quotes${query}`);
}

export function getQuote(id: string) {
  return apiClient.get<ApiResponse<QuoteItem>>(`/quotes/${id}`);
}

export function createQuote(body: { enquiryId: string; packageId: string; discountInr?: number }) {
  return apiClient.post<ApiResponse<QuoteItem>>("/quotes", body);
}

export function sendQuote(id: string) {
  return apiClient.post<ApiResponse<QuoteItem>>(`/quotes/${id}/send`, {});
}

export function acceptQuote(id: string) {
  return apiClient.post<ApiResponse<QuoteItem>>(`/quotes/${id}/accept`, {});
}

export function rejectQuote(id: string) {
  return apiClient.post<ApiResponse<QuoteItem>>(`/quotes/${id}/reject`, {});
}

export function reviseQuote(id: string) {
  return apiClient.post<ApiResponse<QuoteItem>>(`/quotes/${id}/revise`, {});
}
