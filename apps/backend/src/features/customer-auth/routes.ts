import type { FastifyInstance } from "fastify";
import { ServiceError } from "../../lib/service-error.js";
import { parseOrReply } from "../../lib/validate.js";
import { requireCustomer } from "../../plugins/auth.js";
import { otpRequestSchema, otpVerifySchema, quoteIdParamSchema } from "./schema.js";
import { customerDecide, getOwnedQuote, requestOtp, verifyOtp } from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function customerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/customer-auth/otp", async (request, reply) => {
    const body = parseOrReply(otpRequestSchema, request.body, reply);
    if (!body) return;
    try {
      const result = await requestOtp(body.phone, body.quoteId);
      return { success: true, ...result, message: "Code sent." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/customer-auth/verify", async (request, reply) => {
    const body = parseOrReply(otpVerifySchema, request.body, reply);
    if (!body) return;
    try {
      const account = await verifyOtp(body.phone, body.quoteId, body.code);
      const token = await reply.jwtSign({
        actor: "customer",
        sub: account.accountId,
        customerId: account.customerId
      });
      return { success: true, data: { token, customerId: account.customerId }, message: "Signed in." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/customer/quotes/:id", { preHandler: requireCustomer }, async (request, reply) => {
    const params = parseOrReply(quoteIdParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getOwnedQuote(params.id, request.user.customerId ?? "") };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/customer/quotes/:id/accept", { preHandler: requireCustomer }, async (request, reply) => {
    const params = parseOrReply(quoteIdParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await customerDecide(params.id, request.user.customerId ?? "", "accept"), message: "Quote accepted." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/customer/quotes/:id/reject", { preHandler: requireCustomer }, async (request, reply) => {
    const params = parseOrReply(quoteIdParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await customerDecide(params.id, request.user.customerId ?? "", "reject"), message: "Quote rejected." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
