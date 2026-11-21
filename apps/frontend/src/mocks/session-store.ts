export const DEMO_PASSWORD = "hackathon";

export interface MockUser {
  userId: string;
  fullName: string;
  email: string;
  companyName: string;
  role: string;
  createdAt: string;
  password: string;
}

export const usersByEmail = new Map<string, MockUser>();
const tokens = new Map<string, string>();

function addUser(user: MockUser) {
  usersByEmail.set(user.email.toLowerCase(), { ...user, email: user.email.toLowerCase() });
}

addUser({
  userId: "usr-admin-01",
  fullName: "Director Kaur",
  email: "admin@sunpower.in",
  companyName: "SunPower Solutions",
  role: "admin",
  createdAt: "2026-11-04T00:00:00.000Z",
  password: DEMO_PASSWORD
});

addUser({
  userId: "usr-sales-01",
  fullName: "Priya Shah",
  email: "sales@sunpower.in",
  companyName: "SunPower Solutions",
  role: "sales",
  createdAt: "2026-11-04T00:00:00.000Z",
  password: DEMO_PASSWORD
});

addUser({
  userId: "usr-warehouse-01",
  fullName: "Ravi Mehta",
  email: "warehouse@sunpower.in",
  companyName: "SunPower Solutions",
  role: "warehouse",
  createdAt: "2026-11-04T00:00:00.000Z",
  password: DEMO_PASSWORD
});

addUser({
  userId: "usr-tech-01",
  fullName: "Harpreet Singh",
  email: "tech@sunpower.in",
  companyName: "SunPower Solutions",
  role: "technician",
  createdAt: "2026-11-04T00:00:00.000Z",
  password: DEMO_PASSWORD
});

addUser({
  userId: "usr-support-01",
  fullName: "Neha Gill",
  email: "support@sunpower.in",
  companyName: "SunPower Solutions",
  role: "support",
  createdAt: "2026-11-04T00:00:00.000Z",
  password: DEMO_PASSWORD
});

export function publicUser(user: MockUser) {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    companyName: user.companyName,
    role: user.role,
    createdAt: user.createdAt
  };
}

export function issueToken(email: string): string {
  const token = `jwt_starter_${Math.random().toString(36).slice(2)}`;
  tokens.set(token, email.toLowerCase());
  return token;
}

export function userFromRequest(request: Request): MockUser | null {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const email = tokens.get(token);
  if (!email) return null;
  return usersByEmail.get(email) ?? null;
}
