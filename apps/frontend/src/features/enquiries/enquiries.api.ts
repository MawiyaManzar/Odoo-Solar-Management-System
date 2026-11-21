import { apiClient } from "../../lib/api-client";
import type { ApiResponse } from "../../types/api";
import type { EnquiryItem, StaffMember, SurveyItem } from "./types";

export function listStaff(role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return apiClient.get<ApiResponse<StaffMember[]>>(`/staff${query}`);
}

export function listEnquiries(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<ApiResponse<EnquiryItem[]>>(`/enquiries${query}`);
}

export function getEnquiry(id: string) {
  return apiClient.get<ApiResponse<EnquiryItem>>(`/enquiries/${id}`);
}

export function updateEnquiry(id: string, body: Partial<EnquiryItem>) {
  return apiClient.patch<ApiResponse<EnquiryItem>>(`/enquiries/${id}`, body);
}

export function listSurveys(enquiryId: string) {
  return apiClient.get<ApiResponse<SurveyItem[]>>(`/enquiries/${enquiryId}/surveys`);
}

export function scheduleSurvey(enquiryId: string, body: { scheduledAt?: string; technicianId?: string }) {
  return apiClient.post<ApiResponse<SurveyItem>>(`/enquiries/${enquiryId}/surveys`, body);
}

export function updateSurvey(id: string, body: Partial<SurveyItem>) {
  return apiClient.patch<ApiResponse<SurveyItem>>(`/surveys/${id}`, body);
}
