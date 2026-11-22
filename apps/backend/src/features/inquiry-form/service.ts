import { and, asc, count, eq } from "drizzle-orm";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import {
  inquiryFormAnswers,
  inquiryFormQuestions,
  type InquiryFieldType,
  type InquiryMapsTo
} from "../../db/schema/inquiry-form.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import type { InquiryAnswerInput, InquiryOption, InquiryQuestionInput, InquiryQuestionPatch } from "./schema.js";

export type InquiryQuestionResult = {
  id: string;
  key: string;
  label: string;
  helpText: string | null;
  fieldType: InquiryFieldType;
  options: InquiryOption[] | null;
  mapsTo: InquiryMapsTo | null;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InquiryQuestionPublic = Omit<InquiryQuestionResult, "isActive" | "createdAt" | "updatedAt">;

function parseOptions(raw: string | null): InquiryOption[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InquiryOption[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function serializeOptions(options: InquiryOption[] | null | undefined): string | null {
  if (!options || options.length === 0) return null;
  return JSON.stringify(options);
}

function toQuestion(row: typeof inquiryFormQuestions.$inferSelect): InquiryQuestionResult {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    helpText: row.helpText,
    fieldType: row.fieldType as InquiryFieldType,
    options: parseOptions(row.optionsJson),
    mapsTo: (row.mapsTo as InquiryMapsTo | null) ?? null,
    sortOrder: row.sortOrder,
    isRequired: row.isRequired,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toPublic(question: InquiryQuestionResult): InquiryQuestionPublic {
  const { isActive: _a, createdAt: _c, updatedAt: _u, ...rest } = question;
  return rest;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

export async function listPublicInquiryForm(): Promise<{ questions: InquiryQuestionPublic[] }> {
  const rows = await db
    .select()
    .from(inquiryFormQuestions)
    .where(eq(inquiryFormQuestions.isActive, true))
    .orderBy(asc(inquiryFormQuestions.sortOrder), asc(inquiryFormQuestions.key));
  return { questions: rows.map((row) => toPublic(toQuestion(row))) };
}

export async function listInquiryQuestions(): Promise<InquiryQuestionResult[]> {
  const rows = await db
    .select()
    .from(inquiryFormQuestions)
    .orderBy(asc(inquiryFormQuestions.sortOrder), asc(inquiryFormQuestions.key));
  return rows.map(toQuestion);
}

export async function getInquiryQuestion(id: string): Promise<InquiryQuestionResult> {
  const [row] = await db.select().from(inquiryFormQuestions).where(eq(inquiryFormQuestions.id, id)).limit(1);
  if (!row) throw new ServiceError(404, "Question not found.");
  return toQuestion(row);
}

export async function createInquiryQuestion(input: InquiryQuestionInput): Promise<InquiryQuestionResult> {
  try {
    const [row] = await db
      .insert(inquiryFormQuestions)
      .values({
        id: newId(ID_PREFIXES.inquiryQuestion),
        key: input.key,
        label: input.label,
        helpText: input.helpText?.trim() ? input.helpText.trim() : null,
        fieldType: input.fieldType,
        optionsJson: serializeOptions(input.options ?? null),
        mapsTo: input.mapsTo ?? null,
        sortOrder: input.sortOrder,
        isRequired: input.isRequired ?? true,
        isActive: input.isActive ?? true,
        updatedAt: new Date()
      })
      .returning();
    return toQuestion(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(409, "A question with this key already exists.");
    throw error;
  }
}

export async function updateInquiryQuestion(id: string, input: InquiryQuestionPatch): Promise<InquiryQuestionResult> {
  const existing = await getInquiryQuestion(id);
  const nextType = input.fieldType ?? existing.fieldType;
  const nextOptions = input.options !== undefined ? input.options : existing.options;

  if ((nextType === "single_choice" || nextType === "select") && (!nextOptions || nextOptions.length < 1)) {
    throw new ServiceError(400, "Choice questions need at least one option.");
  }
  if (nextType !== "single_choice" && nextType !== "select" && nextOptions && nextOptions.length > 0) {
    throw new ServiceError(400, "Only choice and select questions may have options.");
  }

  try {
    const [row] = await db
      .update(inquiryFormQuestions)
      .set({
        key: input.key ?? existing.key,
        label: input.label ?? existing.label,
        helpText: input.helpText !== undefined ? (input.helpText?.trim() ? input.helpText.trim() : null) : existing.helpText,
        fieldType: nextType,
        optionsJson:
          nextType === "single_choice" || nextType === "select"
            ? serializeOptions(nextOptions)
            : null,
        mapsTo: input.mapsTo !== undefined ? input.mapsTo : existing.mapsTo,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        isRequired: input.isRequired ?? existing.isRequired,
        isActive: input.isActive ?? existing.isActive,
        updatedAt: new Date()
      })
      .where(eq(inquiryFormQuestions.id, id))
      .returning();
    if (!row) throw new ServiceError(404, "Question not found.");
    return toQuestion(row);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (isUniqueViolation(error)) throw new ServiceError(409, "A question with this key already exists.");
    throw error;
  }
}

export async function deleteInquiryQuestion(id: string): Promise<{ id: string; deleted: "hard" | "soft" }> {
  await getInquiryQuestion(id);
  const [usage] = await db
    .select({ total: count() })
    .from(inquiryFormAnswers)
    .where(eq(inquiryFormAnswers.questionId, id));

  if ((usage?.total ?? 0) > 0) {
    await db
      .update(inquiryFormQuestions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(inquiryFormQuestions.id, id));
    return { id, deleted: "soft" };
  }

  await db.delete(inquiryFormQuestions).where(eq(inquiryFormQuestions.id, id));
  return { id, deleted: "hard" };
}

export type ResolvedEnquiryMappings = {
  requestedKw?: number;
  systemKind?: "on_grid" | "off_grid";
  wantsSubsidy?: boolean;
  monthlyBillInr?: number;
  roofAreaSqft?: number;
  gridSuitable?: boolean;
  noteLines: string[];
  answerRows: { questionId: string; answerValue: string; answerLabel: string | null }[];
};

function stringifyValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export async function resolveInquiryAnswers(answers: InquiryAnswerInput[]): Promise<ResolvedEnquiryMappings> {
  const active = await db
    .select()
    .from(inquiryFormQuestions)
    .where(eq(inquiryFormQuestions.isActive, true))
    .orderBy(asc(inquiryFormQuestions.sortOrder));

  const byId = new Map(active.map((row) => [row.id, toQuestion(row)]));
  const answerByQuestion = new Map(answers.map((item) => [item.questionId, item.value]));

  for (const question of active) {
    if (!question.isRequired) continue;
    if (!answerByQuestion.has(question.id)) {
      throw new ServiceError(400, `Answer required for: ${question.label}`);
    }
  }

  for (const answer of answers) {
    if (!byId.has(answer.questionId)) {
      throw new ServiceError(400, `Unknown or inactive question: ${answer.questionId}`);
    }
  }

  const mappings: ResolvedEnquiryMappings = { noteLines: [], answerRows: [] };

  for (const question of active) {
    if (!answerByQuestion.has(question.id)) continue;
    const raw = answerByQuestion.get(question.id)!;
    const q = byId.get(question.id)!;
    let displayLabel: string | null = null;
    let mapSource: string | number | boolean = raw;

    if (q.fieldType === "single_choice" || q.fieldType === "select") {
      const match = q.options?.find((opt) => opt.value === String(raw));
      if (!match) throw new ServiceError(400, `Invalid option for ${q.label}.`);
      displayLabel = match.label;
      if (match.mapValue !== undefined) mapSource = match.mapValue;
    } else if (q.fieldType === "boolean") {
      const boolVal = typeof raw === "boolean" ? raw : String(raw) === "true";
      mapSource = boolVal;
      displayLabel = boolVal ? "Yes" : "No";
    } else if (q.fieldType === "number") {
      const num = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(num)) throw new ServiceError(400, `${q.label} must be a number.`);
      mapSource = num;
      displayLabel = String(num);
    } else {
      displayLabel = String(raw).trim();
      if (q.isRequired && !displayLabel) throw new ServiceError(400, `${q.label} is required.`);
    }

    mappings.noteLines.push(`${q.label}: ${displayLabel ?? stringifyValue(raw)}`);
    mappings.answerRows.push({
      questionId: q.id,
      answerValue: stringifyValue(raw),
      answerLabel: displayLabel
    });

    if (!q.mapsTo) continue;
    switch (q.mapsTo) {
      case "requestedKw": {
        const num = typeof mapSource === "number" ? mapSource : Number(mapSource);
        if (Number.isNaN(num) || num <= 0) throw new ServiceError(400, "Requested kW must be a positive number.");
        mappings.requestedKw = num;
        break;
      }
      case "systemKind": {
        const kind = String(mapSource);
        if (kind !== "on_grid" && kind !== "off_grid") {
          throw new ServiceError(400, "System kind must be on_grid or off_grid.");
        }
        mappings.systemKind = kind;
        break;
      }
      case "wantsSubsidy":
        mappings.wantsSubsidy = Boolean(mapSource);
        break;
      case "monthlyBillInr": {
        const num = typeof mapSource === "number" ? mapSource : Number(mapSource);
        if (Number.isNaN(num) || num < 0) throw new ServiceError(400, "Monthly bill must be a non-negative number.");
        mappings.monthlyBillInr = num;
        break;
      }
      case "roofAreaSqft": {
        const num = typeof mapSource === "number" ? mapSource : Number(mapSource);
        if (Number.isNaN(num) || num < 0) throw new ServiceError(400, "Roof area must be a non-negative number.");
        mappings.roofAreaSqft = num;
        break;
      }
      case "gridSuitable":
        mappings.gridSuitable = Boolean(mapSource);
        break;
      default:
        break;
    }
  }

  return mappings;
}

export async function insertInquiryAnswers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  enquiryId: string,
  answerRows: ResolvedEnquiryMappings["answerRows"]
): Promise<void> {
  if (answerRows.length === 0) return;
  await tx.insert(inquiryFormAnswers).values(
    answerRows.map((row) => ({
      id: newId(ID_PREFIXES.inquiryAnswer),
      enquiryId,
      questionId: row.questionId,
      answerValue: row.answerValue,
      answerLabel: row.answerLabel
    }))
  );
}

export async function listAnswersForEnquiry(enquiryId: string): Promise<
  { questionId: string; answerValue: string; answerLabel: string | null; questionKey: string; questionLabel: string }[]
> {
  const rows = await db
    .select({
      questionId: inquiryFormAnswers.questionId,
      answerValue: inquiryFormAnswers.answerValue,
      answerLabel: inquiryFormAnswers.answerLabel,
      questionKey: inquiryFormQuestions.key,
      questionLabel: inquiryFormQuestions.label
    })
    .from(inquiryFormAnswers)
    .innerJoin(inquiryFormQuestions, eq(inquiryFormAnswers.questionId, inquiryFormQuestions.id))
    .where(eq(inquiryFormAnswers.enquiryId, enquiryId));
  return rows;
}

/** Used by tests / admin diagnostics — count active questions. */
export async function countActiveQuestions(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(inquiryFormQuestions)
    .where(and(eq(inquiryFormQuestions.isActive, true)));
  return row?.total ?? 0;
}
