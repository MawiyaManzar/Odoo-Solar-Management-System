import type { FastifyInstance } from "fastify";
import { ServiceError } from "../../lib/service-error.js";
import { parseOrReply } from "../../lib/validate.js";
import { requireAuth, requireRole } from "../../plugins/auth.js";
import {
  enquiryListQuerySchema,
  enquiryPatchSchema,
  idParamSchema,
  staffQuerySchema,
  surveyCreateSchema,
  surveyPatchSchema
} from "./schema.js";
import {
  createSurvey,
  getEnquiry,
  listEnquiries,
  listStaff,
  listSurveys,
  updateEnquiry,
  updateSurvey
} from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function enquiryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/staff", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(staffQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listStaff(query.role) };
  });

  app.get("/api/enquiries", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(enquiryListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listEnquiries(query) };
  });

  app.get("/api/enquiries/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getEnquiry(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.patch("/api/enquiries/:id", { preHandler: requireRole("sales", "admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(enquiryPatchSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await updateEnquiry(params.id, body), message: "Enquiry updated." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/enquiries/:id/surveys", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await listSurveys(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/enquiries/:id/surveys", { preHandler: requireRole("sales", "technician", "admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(surveyCreateSchema, request.body ?? {}, reply);
    if (!body) return;
    try {
      const survey = await createSurvey(params.id, body);
      return reply.status(201).send({ success: true, data: survey, message: "Survey scheduled." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.patch("/api/surveys/:id", { preHandler: requireRole("technician", "admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(surveyPatchSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await updateSurvey(params.id, body), message: "Survey saved." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
