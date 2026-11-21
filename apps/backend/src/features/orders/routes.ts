import type { FastifyInstance } from "fastify";
import { parseOrReply } from "../../lib/validate.js";
import { ServiceError } from "../../lib/service-error.js";
import { requireAuth, requireRole } from "../../plugins/auth.js";
import {
  orderCreateSchema,
  orderIdSchema,
  orderListQuerySchema,
  orderPatchSchema,
  paymentBodySchema,
  scheduleSchema
} from "./schema.js";
import {
  createOrderFromQuote,
  getOrder,
  listOrders,
  listPayments,
  recordPayment,
  scheduleOrder,
  updateOrder
} from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function ordersRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/orders", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(orderListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listOrders(query.status) };
  });

  app.post("/api/orders", { preHandler: requireRole("admin", "sales") }, async (request, reply) => {
    const body = parseOrReply(orderCreateSchema, request.body, reply);
    if (!body) return;
    try {
      const order = await createOrderFromQuote(body);
      return reply.status(201).send({ success: true, data: order, message: "Order created." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/orders/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(orderIdSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getOrder(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.patch("/api/orders/:id", { preHandler: requireRole("admin", "sales") }, async (request, reply) => {
    const params = parseOrReply(orderIdSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(orderPatchSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await updateOrder(params.id, body), message: "Order updated." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/orders/:id/schedule", { preHandler: requireRole("admin", "sales") }, async (request, reply) => {
    const params = parseOrReply(orderIdSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(scheduleSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await scheduleOrder(params.id, body), message: "Installation scheduled." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/orders/:id/payments", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(orderIdSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await listPayments(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/orders/:id/payments", { preHandler: requireRole("admin", "sales") }, async (request, reply) => {
    const params = parseOrReply(orderIdSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(paymentBodySchema, request.body, reply);
    if (!body) return;
    try {
      const payment = await recordPayment(params.id, body, request.user.sub);
      return reply.status(201).send({ success: true, data: payment, message: "Payment recorded." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
