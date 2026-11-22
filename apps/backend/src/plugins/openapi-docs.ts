import type { FastifyInstance, RouteOptions } from "fastify";
import scalarApiReference from "@scalar/fastify-api-reference";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

type CollectedRoute = {
  method: HttpMethod;
  path: string;
  public: boolean;
};

const HTTP_METHODS = new Set<string>(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);

const PUBLIC_PATHS = new Set([
  "GET /api/health",
  "POST /api/auth/signup",
  "POST /api/auth/login",
  "GET /api/public/packages",
  "GET /api/public/packages/:id",
  "GET /api/public/inquiry-form",
  "POST /api/public/enquiries",
  "POST /api/customer-auth/otp",
  "POST /api/customer-auth/verify",
  "POST /api/customer-auth/sign-in/otp",
  "POST /api/customer-auth/sign-in/verify",
]);

function tagForPath(path: string): string {
  if (path.startsWith("/api/health")) return "Health";
  if (path.startsWith("/api/auth")) return "Auth";
  if (path.startsWith("/api/public")) return "Public";
  if (path.startsWith("/api/customer-auth") || path.startsWith("/api/customer")) return "Customer portal";
  if (path.startsWith("/api/products") || path.startsWith("/api/packages")) return "Catalog";
  if (
    path.startsWith("/api/enquiries") ||
    path.startsWith("/api/surveys") ||
    path.startsWith("/api/staff") ||
    path.startsWith("/api/customers")
  ) {
    return "Enquiries";
  }
  if (path.startsWith("/api/quotes")) return "Quotes";
  if (path.startsWith("/api/orders")) return "Orders";
  if (
    path.startsWith("/api/stock") ||
    path.startsWith("/api/serial-units") ||
    path.startsWith("/api/dispatches")
  ) {
    return "Inventory";
  }
  if (path.startsWith("/api/installations")) return "Installations";
  if (path.startsWith("/api/service-tickets")) return "Service tickets";
  if (path.startsWith("/api/reports")) return "Reports";
  if (path.startsWith("/api/records")) return "Records";
  return "Other";
}

function openApiPath(fastifyPath: string): string {
  return fastifyPath.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

function pathParams(fastifyPath: string): Array<{
  name: string;
  in: "path";
  required: true;
  schema: { type: "string" };
}> {
  const names = [...fastifyPath.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]!);
  return names.map((name) => ({
    name,
    in: "path" as const,
    required: true as const,
    schema: { type: "string" as const },
  }));
}

function buildOpenApiDocument(routes: CollectedRoute[]) {
  const paths: Record<string, Record<string, unknown>> = {};

  const sorted = [...routes].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  for (const route of sorted) {
    const pathKey = openApiPath(route.path);
    const operation: Record<string, unknown> = {
      tags: [tagForPath(route.path)],
      summary: `${route.method.toUpperCase()} ${route.path}`,
      operationId: `${route.method}_${route.path.replace(/[^a-zA-Z0-9]+/g, "_")}`.replace(/_+/g, "_"),
      responses: {
        "200": {
          description: "OK — `{ success: true, data }`",
        },
        "400": { description: "Validation error" },
        "401": { description: "Authentication required" },
        "403": { description: "Forbidden" },
        "404": { description: "Not found" },
        "409": { description: "Conflict" },
      },
    };

    const params = pathParams(route.path);
    if (params.length > 0) {
      operation.parameters = params;
    }

    if (!route.public) {
      operation.security = [{ bearerAuth: [] }];
    }

    paths[pathKey] ??= {};
    paths[pathKey][route.method] = operation;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "SunPower API",
      version: "1.0.0",
      description:
        "Live list of **implemented** Fastify routes. Request/response field shapes live in `docs/API.md` and `apps/backend/src/contracts/results.ts`.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local backend" }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Public" },
      { name: "Customer portal" },
      { name: "Catalog" },
      { name: "Enquiries" },
      { name: "Quotes" },
      { name: "Orders" },
      { name: "Inventory" },
      { name: "Installations" },
      { name: "Service tickets" },
      { name: "Records" },
      { name: "Other" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Staff or customer JWT from login / OTP verify. Header: `Authorization: Bearer <token>`.",
        },
      },
    },
    paths,
  };
}

function collectFromRouteOptions(routeOptions: RouteOptions, sink: CollectedRoute[]): void {
  const url = routeOptions.url;
  if (!url.startsWith("/api")) return;

  const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method];
  for (const method of methods) {
    if (typeof method !== "string") continue;
    const upper = method.toUpperCase();
    if (!HTTP_METHODS.has(upper) || upper === "HEAD" || upper === "OPTIONS") continue;
    const lower = upper.toLowerCase() as HttpMethod;
    const key = `${upper} ${url}`;
    sink.push({
      method: lower,
      path: url,
      public: PUBLIC_PATHS.has(key),
    });
  }
}

/**
 * Serves a browsable API list at `/docs` (Scalar) and raw OpenAPI at `/openapi.json`.
 * Spec is built from routes Fastify actually registered under `/api`.
 */
export async function registerOpenApiDocs(app: FastifyInstance): Promise<void> {
  const collected: CollectedRoute[] = [];

  app.addHook("onRoute", (routeOptions) => {
    collectFromRouteOptions(routeOptions, collected);
  });

  app.get("/openapi.json", async (_request, reply) => {
    reply.type("application/json");
    return buildOpenApiDocument(collected);
  });

  await app.register(scalarApiReference, {
    routePrefix: "/docs",
    configuration: {
      url: "/openapi.json",
      theme: "default",
    },
  });
}
