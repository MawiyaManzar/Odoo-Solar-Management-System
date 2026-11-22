import type { FastifyInstance } from "fastify";
import { ServiceError } from "../../lib/service-error.js";
import { parseOrReply } from "../../lib/validate.js";
import { requireAuth, requireRole } from "../../plugins/auth.js";
import {
  idParamSchema,
  packageBodySchema,
  packagePatchSchema,
  productBodySchema,
  productListQuerySchema,
  productPatchSchema,
  publicEnquiryBodySchema
} from "./schema.js";
import {
  createPackage,
  createProduct,
  createPublicEnquiry,
  getPackage,
  getProduct,
  listPackages,
  listProducts,
  updatePackage,
  updateProduct
} from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/public/packages", async () => {
    return { success: true, data: await listPackages(true) };
  });

  app.get("/api/public/packages/:id", async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getPackage(params.id, { activeOnly: true }) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/public/enquiries", async (request, reply) => {
    const body = parseOrReply(publicEnquiryBodySchema, request.body, reply);
    if (!body) return;
    try {
      const created = await createPublicEnquiry(body);
      return reply.status(201).send({ success: true, data: created, message: "Enquiry received." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/products", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(productListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listProducts(query) };
  });

  app.get("/api/products/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getProduct(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/products", { preHandler: requireRole("admin") }, async (request, reply) => {
    const body = parseOrReply(productBodySchema, request.body, reply);
    if (!body) return;
    try {
      const product = await createProduct(body);
      return reply.status(201).send({ success: true, data: product, message: "Product created." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.patch("/api/products/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(productPatchSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await updateProduct(params.id, body), message: "Product updated." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.get("/api/packages", { preHandler: requireAuth }, async () => {
    return { success: true, data: await listPackages(false) };
  });

  app.get("/api/packages/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getPackage(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/packages", { preHandler: requireRole("admin") }, async (request, reply) => {
    const body = parseOrReply(packageBodySchema, request.body, reply);
    if (!body) return;
    try {
      const created = await createPackage(body);
      return reply.status(201).send({ success: true, data: created, message: "Package created." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.patch("/api/packages/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(packagePatchSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await updatePackage(params.id, body), message: "Package updated." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
