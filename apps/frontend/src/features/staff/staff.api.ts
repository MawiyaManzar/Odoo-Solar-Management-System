import { apiClient } from "../../lib/api-client";
import type { ApiList, CreateStaffInput, StaffMember } from "./types";

export function listStaff(role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return apiClient.get<ApiList<StaffMember[]>>(`/staff${query}`);
}

export function createStaff(body: Omit<CreateStaffInput, "confirmPassword">) {
  return apiClient.post<ApiList<StaffMember>>("/staff", body);
}
