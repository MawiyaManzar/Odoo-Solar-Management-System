export const DEV_PASSWORD = "hackathon";

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "sales" | "warehouse" | "technician" | "support";
  phone?: number;
}

export interface SeedRecord {
  id: string;
  title: string;
  category: string;
  status: "active" | "pending" | "archived";
  value: number;
  updatedAt: string;
}

/** One user per SunPower role — shared password `hackathon`. */
export const starterUsersSeedData: SeedUser[] = [
  {
    id: "usr-admin-01",
    email: "admin@sunpower.in",
    name: "Director Kaur",
    role: "admin",
    phone: 9811100001
  },
  {
    id: "usr-sales-01",
    email: "sales@sunpower.in",
    name: "Priya Shah",
    role: "sales",
    phone: 9811100002
  },
  {
    id: "usr-warehouse-01",
    email: "warehouse@sunpower.in",
    name: "Ravi Mehta",
    role: "warehouse",
    phone: 9811100003
  },
  {
    id: "usr-tech-01",
    email: "tech@sunpower.in",
    name: "Harpreet Singh",
    role: "technician",
    phone: 9811100004
  },
  {
    id: "usr-support-01",
    email: "support@sunpower.in",
    name: "Neha Gill",
    role: "support",
    phone: 9811100005
  }
];

/** Kept as a copy-paste reference feature for the template. */
export const starterRecordsSeedData: SeedRecord[] = [
  {
    id: "REC-1001",
    title: "Global Enterprise Architecture Deployment",
    category: "Infrastructure",
    status: "active",
    value: 45000,
    updatedAt: "2026-11-04T02:30:00.000Z"
  },
  {
    id: "REC-1002",
    title: "High-Throughput Fastify Core Runtime",
    category: "Backend Engine",
    status: "active",
    value: 28000,
    updatedAt: "2026-11-04T02:15:00.000Z"
  },
  {
    id: "REC-1003",
    title: "PostgreSQL Database Migration & Seed Pipeline",
    category: "Database",
    status: "pending",
    value: 17500,
    updatedAt: "2026-11-04T01:45:00.000Z"
  },
  {
    id: "REC-1004",
    title: "Legacy Monolith Microservice Extraction",
    category: "Refactoring",
    status: "archived",
    value: 12000,
    updatedAt: "2026-11-03T23:10:00.000Z"
  },
  {
    id: "REC-1005",
    title: "MSW Network Interception & Test Harness",
    category: "Quality Assurance",
    status: "active",
    value: 21500,
    updatedAt: "2026-11-03T22:00:00.000Z"
  }
];
