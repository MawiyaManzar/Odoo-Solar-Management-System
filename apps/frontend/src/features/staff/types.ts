export type StaffRole = "sales" | "warehouse" | "technician" | "support" | "admin";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole | string;
  companyName?: string;
  createdAt?: string;
}

export interface CreateStaffInput {
  fullName: string;
  email: string;
  companyName: string;
  role: string;
  password: string;
  confirmPassword?: string;
}

export interface ApiList<T> {
  success: true;
  data: T;
  message?: string;
}
