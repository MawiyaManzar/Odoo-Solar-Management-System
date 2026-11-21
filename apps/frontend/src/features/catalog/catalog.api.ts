import { apiClient } from "../../lib/api-client";
import type { ApiResponse } from "../../types/api";
import type { PackageInput, PackageItem, ProductInput, ProductItem, PublicEnquiryInput } from "./types";

export function listPublicPackages() {
  return apiClient.get<ApiResponse<PackageItem[]>>("/public/packages");
}

export function listProducts() {
  return apiClient.get<ApiResponse<ProductItem[]>>("/products");
}

export function createProduct(body: ProductInput) {
  return apiClient.post<ApiResponse<ProductItem>>("/products", body);
}

export function updateProduct(id: string, body: Partial<ProductInput>) {
  return apiClient.patch<ApiResponse<ProductItem>>(`/products/${id}`, body);
}

export function listPackages() {
  return apiClient.get<ApiResponse<PackageItem[]>>("/packages");
}

export function getPackage(id: string) {
  return apiClient.get<ApiResponse<PackageItem>>(`/packages/${id}`);
}

export function createPackage(body: PackageInput) {
  return apiClient.post<ApiResponse<PackageItem>>("/packages", body);
}

export function updatePackage(id: string, body: Partial<PackageInput>) {
  return apiClient.patch<ApiResponse<PackageItem>>(`/packages/${id}`, body);
}

export function submitPublicEnquiry(body: PublicEnquiryInput) {
  return apiClient.post<ApiResponse<{ customer: { id: string }; enquiry: { id: string } }>>("/public/enquiries", body);
}
