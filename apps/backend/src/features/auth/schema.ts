import { z } from "zod";

/** Admin-provisioned staff roles — directors stay seed-only. */
export const STAFF_ROLES = ["sales", "warehouse", "technician", "support"] as const;

/** @deprecated Public signup is closed; use createStaffSchema via POST /api/staff. */
export const PUBLIC_SIGNUP_ROLES = STAFF_ROLES;

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  companyName: z.string().trim().min(1, "Company or organization name is required."),
  role: z.enum(STAFF_ROLES, { message: "Choose sales, warehouse, technician, or support." }),
  password: z.string().min(8, "Password must be at least 8 characters long.")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
/** Alias kept for existing service callers. */
export type SignupInput = CreateStaffInput;
export type LoginInput = z.infer<typeof loginSchema>;
