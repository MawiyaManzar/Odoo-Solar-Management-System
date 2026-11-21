export interface AppRoleOption {
  value: string;
  label: string;
}

export interface AppConfig {
  name: string;
  tagline: string;
  version: string;
  defaultRoles: AppRoleOption[];
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
  ]
};
