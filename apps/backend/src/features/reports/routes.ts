import type { FastifyInstance } from "fastify";
import { requireRole } from "../../plugins/auth.js";
import { listJobMargins } from "./service.js";

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/reports/job-margins", { preHandler: requireRole("admin") }, async () => {
    return { success: true, data: await listJobMargins() };
  });
}
