import { z } from "zod";

/** Job margins has no query or body in Phase 1. */
export const jobMarginsQuerySchema = z.object({}).strict();
