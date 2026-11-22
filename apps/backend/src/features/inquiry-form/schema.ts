import { z } from "zod";
import { INQUIRY_FIELD_TYPES, INQUIRY_MAPS_TO } from "../../db/schema/inquiry-form.js";

export const inquiryOptionSchema = z.object({
  value: z.string().trim().min(1, "Option value is required."),
  label: z.string().trim().min(1, "Option label is required."),
  mapValue: z.union([z.number(), z.boolean(), z.string()]).optional()
});

const choiceTypes = new Set(["single_choice", "select"]);

function refineOptions(
  value: { fieldType: string; options?: z.infer<typeof inquiryOptionSchema>[] | null },
  ctx: z.RefinementCtx
): void {
  if (choiceTypes.has(value.fieldType)) {
    if (!value.options || value.options.length < 1) {
      ctx.addIssue({ code: "custom", message: "Choice questions need at least one option.", path: ["options"] });
    }
  } else if (value.options != null && value.options.length > 0) {
    ctx.addIssue({ code: "custom", message: "Only choice and select questions may have options.", path: ["options"] });
  }
}

export const inquiryQuestionBodySchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1, "Key is required.")
      .regex(/^[a-z][a-z0-9_]*$/, "Key must start with a letter and use lowercase letters, numbers, or underscores."),
    label: z.string().trim().min(1, "Label is required."),
    helpText: z.string().trim().optional().nullable(),
    fieldType: z.enum(INQUIRY_FIELD_TYPES),
    options: z.array(inquiryOptionSchema).optional().nullable(),
    mapsTo: z.enum(INQUIRY_MAPS_TO).optional().nullable(),
    sortOrder: z.number().int().min(0, "Sort order must be 0 or more."),
    isRequired: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .superRefine(refineOptions);

export const inquiryQuestionPatchSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1, "Key is required.")
      .regex(/^[a-z][a-z0-9_]*$/, "Key must start with a letter and use lowercase letters, numbers, or underscores.")
      .optional(),
    label: z.string().trim().min(1, "Label is required.").optional(),
    helpText: z.string().trim().optional().nullable(),
    fieldType: z.enum(INQUIRY_FIELD_TYPES).optional(),
    options: z.array(inquiryOptionSchema).optional().nullable(),
    mapsTo: z.enum(INQUIRY_MAPS_TO).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    isRequired: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." })
  .superRefine((value, ctx) => {
    if (value.fieldType) {
      refineOptions(
        { fieldType: value.fieldType, options: value.options },
        ctx
      );
    } else if (value.options != null && value.options.length > 0) {
      // options-only patch: allow without re-checking type (service validates against stored type)
    }
  });

export const inquiryQuestionIdSchema = z.object({
  id: z.string().min(1)
});

export const inquiryAnswerInputSchema = z.object({
  questionId: z.string().min(1, "Question id is required."),
  value: z.union([z.string(), z.number(), z.boolean()])
});

export type InquiryQuestionInput = z.infer<typeof inquiryQuestionBodySchema>;
export type InquiryQuestionPatch = z.infer<typeof inquiryQuestionPatchSchema>;
export type InquiryAnswerInput = z.infer<typeof inquiryAnswerInputSchema>;
export type InquiryOption = z.infer<typeof inquiryOptionSchema>;
