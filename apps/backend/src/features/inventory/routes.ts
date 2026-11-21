import type { FastifyInstance } from "fastify";
import { ServiceError } from "../../lib/service-error.js";
import { parseOrReply } from "../../lib/validate.js";
import { requireAuth, requireRole } from "../../plugins/auth.js";
import {
  dispatchCreateSchema,
  dispatchListQuerySchema,
  idParamSchema,
  productIdParamSchema,
  scanOutSchema,
  serialCreateSchema,
  serialListQuerySchema,
  stockPatchSchema
} from "./schema.js";
import {
  createDispatch,
  createSerial,
  deliverDispatch,
  getDispatch,
  listDispatches,
  listSerials,
  listStock,
  markInTransit,
  scanOut,
  updateStock
} from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/stock", { preHandler: requireAuth }, async () => {
    return { success: true, data: await listStock() };
  });

  app.patch("/api/stock/:productId", { preHandler: requireRole("warehouse", "admin") }, async (request, reply) => {
    const params = parseOrReply(productIdParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(stockPatchSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await updateStock(params.productId, body), message: "Stock updated." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/serial-units", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(serialListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listSerials(query) };
  });

  app.post("/api/serial-units", { preHandler: requireRole("warehouse", "admin") }, async (request, reply) => {
    const body = parseOrReply(serialCreateSchema, request.body, reply);
    if (!body) return;
    try {
      const serial = await createSerial(body);
      return reply.status(201).send({ success: true, data: serial, message: "Serial added." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/serial-units/:id/scan-out", { preHandler: requireRole("warehouse", "admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(scanOutSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await scanOut(params.id, body), message: "Serial scanned." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/dispatches", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(dispatchListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listDispatches(query) };
  });

  app.post("/api/dispatches", { preHandler: requireRole("warehouse", "admin") }, async (request, reply) => {
    const body = parseOrReply(dispatchCreateSchema, request.body, reply);
    if (!body) return;
    try {
      const dispatch = await createDispatch(body, request.user.sub);
      return reply.status(201).send({ success: true, data: dispatch, message: "Dispatch created." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/dispatches/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getDispatch(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/dispatches/:id/in-transit", { preHandler: requireRole("warehouse", "admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await markInTransit(params.id), message: "Dispatch is in transit." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/dispatches/:id/deliver", { preHandler: requireRole("warehouse", "admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await deliverDispatch(params.id), message: "Dispatch delivered." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
