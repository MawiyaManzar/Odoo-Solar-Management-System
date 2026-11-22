export interface AppRoleOption {
  value: string;
  label: string;
}

export interface AppConfig {
  name: string;
  tagline: string;
  version: string;
  defaultRoles: AppRoleOption[];
  /** Roles an admin may assign when creating staff — admin itself stays seed-only. */
  signupRoles: AppRoleOption[];
}

export const APP_CONFIG: AppConfig = {
  name: "SunPower",
  tagline: "Solar Installation Management",
  version: "v1.0.0",
  defaultRoles: [
    { value: "admin", label: "Director / Admin" },
    { value: "sales", label: "Sales" },
    { value: "warehouse", label: "Warehouse" },
    { value: "technician", label: "Technician" },
    { value: "support", label: "Support" }
  ],
  signupRoles: [
    { value: "sales", label: "Sales" },
    { value: "warehouse", label: "Warehouse" },
    { value: "technician", label: "Technician" },
    { value: "support", label: "Support" }
  ]
};
