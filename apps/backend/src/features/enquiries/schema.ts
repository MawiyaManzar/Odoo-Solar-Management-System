import { z } from "zod";
import { ENQUIRY_STATUSES, ENQUIRY_SYSTEM_KINDS, SURVEY_RESULTS } from "../../db/schema/enquiries.js";
import { USER_ROLES } from "../../db/schema/users.js";
import { isBeforeTodayInIndia } from "../../lib/dates.js";

export const idParamSchema = z.object({ id: z.string().min(1) });

export const staffQuerySchema = z.object({
  role: z.enum(USER_ROLES).optional()
});

export const enquiryListQuerySchema = z.object({
  status: z.enum(ENQUIRY_STATUSES).optional(),
  assignedTo: z.string().min(1).optional()
});

export const enquiryPatchSchema = z.object({
  /** Matches `enquiries.requested_kw numeric(4, 1)` */
  requestedKw: z.number().positive().max(999.9).optional(),
  systemKind: z.enum(ENQUIRY_SYSTEM_KINDS).nullable().optional(),
  wantsSubsidy: z.boolean().optional(),
  monthlyBillInr: z.number().nonnegative().nullable().optional(),
  roofAreaSqft: z.number().nonnegative().nullable().optional(),
  gridSuitable: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(ENQUIRY_STATUSES).optional()
});

export const surveyCreateSchema = z
  .object({
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    technicianId: z.string().min(1).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.scheduledAt) return;
    if (isBeforeTodayInIndia(value.scheduledAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledAt"],
        message: "Survey can only be scheduled from today onwards."
      });
    }
  });

export const surveyPatchSchema = z.object({
  roofDirection: z.string().nullable().optional(),
  tiltDegrees: z.number().nullable().optional(),
  cableDistanceM: z.number().nullable().optional(),
  usableAreaSqft: z.number().nullable().optional(),
  shadowNotes: z.string().nullable().optional(),
  result: z.enum(SURVEY_RESULTS).optional(),
  completedAt: z.string().datetime({ offset: true }).nullable().optional()
});

export type EnquiryPatch = z.infer<typeof enquiryPatchSchema>;
export type SurveyCreate = z.infer<typeof surveyCreateSchema>;
export type SurveyPatch = z.infer<typeof surveyPatchSchema>;
