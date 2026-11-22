import type { FastifyInstance } from "fastify";
import { parseOrReply } from "../../lib/validate.js";
import { ServiceError } from "../../lib/service-error.js";
import { requireAuth, requireRole } from "../../plugins/auth.js";
import { createStaffSchema, loginSchema } from "./schema.js";
import { getCurrentUser, login, signup } from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /** Public self-signup is closed — only a director can provision staff. */
  app.post("/api/auth/signup", async (_request, reply) => {
    return reply.status(403).send({
      success: false,
      message: "Staff accounts are created by a director. Ask your admin to add you from the Staff page."
    });
  });

  app.post("/api/staff", { preHandler: requireRole("admin") }, async (request, reply) => {
    const body = parseOrReply(createStaffSchema, request.body, reply);
    if (!body) return;

    try {
      const user = await signup(body);
      return reply.status(201).send({
        success: true,
        data: {
          id: user.userId,
          name: user.fullName,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          createdAt: user.createdAt
        },
        message: "Staff account created."
      });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = parseOrReply(loginSchema, request.body, reply);
    if (!body) return;

    try {
      const user = await login(body);
      const token = await reply.jwtSign({ sub: user.userId, email: user.email, role: user.role });
      return reply.send({
        success: true,
        data: { ...user, token },
        message: "Signed in."
      });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = await getCurrentUser(request.user.sub);
      return { success: true, data: user };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
