import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./features/auth/routes.js";
import { catalogRoutes } from "./features/catalog/routes.js";
import { customerAuthRoutes } from "./features/customer-auth/routes.js";
import { enquiryRoutes } from "./features/enquiries/routes.js";
import { healthRoutes } from "./features/health/routes.js";
import { inventoryRoutes } from "./features/inventory/routes.js";
import { ordersRoutes } from "./features/orders/routes.js";
import { quoteRoutes } from "./features/quotes/routes.js";
import { recordsRoutes } from "./features/records/routes.js";
import { reportsRoutes } from "./features/reports/routes.js";
import { serviceTicketsRoutes } from "./features/service-tickets/routes.js";
import { registerAuth } from "./plugins/auth.js";
import { registerDb } from "./plugins/db.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { registerOpenApiDocs } from "./plugins/openapi-docs.js";

export async function buildApp(options?: { logger?: boolean }): Promise<FastifyInstance> {
  const app = Fastify({ logger: options?.logger ?? true });

  await app.register(cors, { origin: "*" });
  registerDb(app);
  await registerAuth(app);
  registerErrorHandler(app);
  // Collect `/api` routes as they register; UI at `/docs`, raw spec at `/openapi.json`.
  await registerOpenApiDocs(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(catalogRoutes);
  await app.register(customerAuthRoutes);
  await app.register(enquiryRoutes);
  await app.register(quoteRoutes);
  await app.register(ordersRoutes);
  await app.register(inventoryRoutes);
  await app.register(recordsRoutes);
  await app.register(serviceTicketsRoutes);
  await app.register(reportsRoutes);

  return app;
}
