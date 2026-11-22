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

export function requestSignInOtp(phone: number) {
  return apiClient.post<{ success: boolean; devCode?: string; message?: string }>("/customer-auth/sign-in/otp", { phone });
}

export function verifySignInOtp(phone: number, code: string) {
  return apiClient.post<ApiResponse<{ token: string; customerId: string }>>("/customer-auth/sign-in/verify", { phone, code });
}

export interface CustomerOrder {
  id: string;
  status: string;
  systemKw: number;
  systemKind: string;
  siteAddress: string;
  totalInr: number;
  paidInr: number;
  balanceInr: number;
  payments: { id: string; amountInr: number; kind: string; method: string | null; paidAt: string; reference: string | null }[];
  dispatches: { id: string; status: string; dispatchedAt: string | null; deliveredAt: string | null; vehicleNotes: string | null }[];
  serials: {
    id: string;
    serialNumber: string;
    productName: string;
    status: string;
    deliveredAt: string | null;
    warrantyEndsAt: string | null;
    underWarranty: boolean | null;
  }[];
}

export interface CustomerServiceTicket {
  id: string;
  orderId: string | null;
  serialUnitId: string | null;
  faultCode: string | null;
  description: string;
  underWarranty: boolean | null;
  billableInr: number;
  status: string;
  serialNumber: string | null;
  productName: string | null;
  createdAt: string;
}

export interface SupportAskResult {
  answer: string;
  topic: string;
}

export function listCustomerOrders() {
  return apiClient.get<ApiResponse<CustomerOrder[]>>("/customer/orders", { headers: customerAuth() });
}

export function listCustomerQuotes() {
  return apiClient.get<ApiResponse<QuoteItem[]>>("/customer/quotes", { headers: customerAuth() });
}

export function listCustomerTickets() {
  return apiClient.get<ApiResponse<CustomerServiceTicket[]>>("/customer/service-tickets", {
    headers: customerAuth()
  });
}

export function createCustomerTicket(body: {
  serialUnitId: string;
  faultCode?: string;
  description: string;
  billableInr?: number;
}) {
  return apiClient.post<ApiResponse<CustomerServiceTicket>>("/customer/service-tickets", body, {
    headers: customerAuth()
  });
}

export function askCustomerSupport(question: string) {
  return apiClient.post<ApiResponse<SupportAskResult>>(
    "/customer/support/ask",
    { question },
    { headers: customerAuth() }
  );
}

export function startCustomerCheckout(orderId: string, amountInr: number) {
  return apiClient.post<ApiResponse<{ sessionId: string; url: string }>>(
    `/customer/orders/${orderId}/checkout`,
    { amountInr },
    { headers: customerAuth() }
  );
}

export function confirmCustomerCheckout(orderId: string, sessionId: string) {
  return apiClient.post<ApiResponse<{ id: string }>>(
    `/customer/orders/${orderId}/payments/confirm`,
    { sessionId },
    { headers: customerAuth() }
  );
}

export function requestCustomerOtp(phone: number, quoteId: string) {
  return apiClient.post<{ success: boolean; devCode?: string; message?: string }>("/customer-auth/otp", { phone, quoteId });
}

export function verifyCustomerOtp(phone: number, quoteId: string, code: string) {
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
