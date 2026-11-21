import { apiClient } from "../../lib/api-client";
import type { ApiResponse } from "../../types/api";
import type { QuoteItem } from "../quotes/types";

const CUSTOMER_TOKEN_KEY = "sunpower.customerToken";

export function getCustomerToken(): string | null {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string | null): void {
  if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

function customerAuth(): Record<string, string> {
  const token = getCustomerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function requestCustomerOtp(phone: string, quoteId: string) {
  return apiClient.post<{ success: boolean; devCode?: string; message?: string }>("/customer-auth/otp", { phone, quoteId });
}

export function verifyCustomerOtp(phone: string, quoteId: string, code: string) {
  return apiClient.post<ApiResponse<{ token: string; customerId: string }>>("/customer-auth/verify", { phone, quoteId, code });
}

export function getCustomerQuote(id: string) {
  return apiClient.get<ApiResponse<QuoteItem>>(`/customer/quotes/${id}`, { headers: customerAuth() });
}

export function acceptCustomerQuote(id: string) {
  return apiClient.post<ApiResponse<QuoteItem>>(`/customer/quotes/${id}/accept`, {}, { headers: customerAuth() });
}

export function rejectCustomerQuote(id: string) {
  return apiClient.post<ApiResponse<QuoteItem>>(`/customer/quotes/${id}/reject`, {}, { headers: customerAuth() });
}
