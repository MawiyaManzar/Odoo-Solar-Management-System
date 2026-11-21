import { apiClient } from "../../lib/api-client";
import type { ApiList, JobMarginItem, ServiceTicketItem, ServiceTicketStatus } from "./types";

export function listJobMargins() {
  return apiClient.get<ApiList<JobMarginItem[]>>("/reports/job-margins");
}

export function listServiceTickets(status?: ServiceTicketStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<ApiList<ServiceTicketItem[]>>(`/service-tickets${query}`);
}
