import { apiClient } from "../../lib/api-client";
import type { ApiResponse } from "../../types/api";
import type { InquiryQuestion, InquiryQuestionInput, InquiryQuestionPatch, InquiryQuestionPublic } from "./types";

export function getPublicInquiryForm() {
  return apiClient.get<ApiResponse<{ questions: InquiryQuestionPublic[] }>>("/public/inquiry-form");
}

export function listInquiryQuestions() {
  return apiClient.get<ApiResponse<InquiryQuestion[]>>("/admin/inquiry-questions");
}

export function createInquiryQuestion(body: InquiryQuestionInput) {
  return apiClient.post<ApiResponse<InquiryQuestion>>("/admin/inquiry-questions", body);
}

export function updateInquiryQuestion(id: string, body: InquiryQuestionPatch) {
  return apiClient.patch<ApiResponse<InquiryQuestion>>(`/admin/inquiry-questions/${id}`, body);
}

export function deleteInquiryQuestion(id: string) {
  return apiClient.delete<ApiResponse<{ id: string; deleted: "hard" | "soft" }>>(`/admin/inquiry-questions/${id}`);
}
