import type { FastifyInstance } from "fastify";
import { parseOrReply } from "../../lib/validate.js";
import { ServiceError } from "../../lib/service-error.js";
import { requireRole } from "../../plugins/auth.js";
import {
  inquiryQuestionBodySchema,
  inquiryQuestionIdSchema,
  inquiryQuestionPatchSchema
} from "./schema.js";
import {
  createInquiryQuestion,
  deleteInquiryQuestion,
  listInquiryQuestions,
  listPublicInquiryForm,
  updateInquiryQuestion
} from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function inquiryFormRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/public/inquiry-form", async () => {
    return { success: true, data: await listPublicInquiryForm() };
  });

  app.get("/api/admin/inquiry-questions", { preHandler: requireRole("admin") }, async () => {
    return { success: true, data: await listInquiryQuestions() };
  });

  app.post("/api/admin/inquiry-questions", { preHandler: requireRole("admin") }, async (request, reply) => {
    const body = parseOrReply(inquiryQuestionBodySchema, request.body, reply);
    if (!body) return;
    try {
      const question = await createInquiryQuestion(body);
      return reply.status(201).send({ success: true, data: question, message: "Question created." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.patch("/api/admin/inquiry-questions/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const params = parseOrReply(inquiryQuestionIdSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(inquiryQuestionPatchSchema, request.body, reply);
    if (!body) return;
    try {
      return {
        success: true,
        data: await updateInquiryQuestion(params.id, body),
        message: "Question updated."
      };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.delete("/api/admin/inquiry-questions/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const params = parseOrReply(inquiryQuestionIdSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await deleteInquiryQuestion(params.id), message: "Question removed." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
