import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { enquiries } from "./enquiries.js";

export const INQUIRY_FIELD_TYPES = ["single_choice", "select", "text", "number", "boolean"] as const;
export type InquiryFieldType = (typeof INQUIRY_FIELD_TYPES)[number];

export const INQUIRY_MAPS_TO = [
  "requestedKw",
  "systemKind",
  "wantsSubsidy",
  "monthlyBillInr",
  "roofAreaSqft",
  "gridSuitable"
] as const;
export type InquiryMapsTo = (typeof INQUIRY_MAPS_TO)[number];

export const inquiryFormQuestions = pgTable(
  "inquiry_form_questions",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    helpText: text("help_text"),
    fieldType: text("field_type").notNull(),
    optionsJson: text("options_json"),
    mapsTo: text("maps_to"),
    sortOrder: integer("sort_order").notNull().default(0),
    isRequired: boolean("is_required").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("inquiry_form_questions_key_uidx").on(table.key),
    check(
      "inquiry_form_questions_field_type_check",
      sql`${table.fieldType} in ('single_choice', 'select', 'text', 'number', 'boolean')`
    ),
    check(
      "inquiry_form_questions_maps_to_check",
      sql`${table.mapsTo} is null or ${table.mapsTo} in ('requestedKw', 'systemKind', 'wantsSubsidy', 'monthlyBillInr', 'roofAreaSqft', 'gridSuitable')`
    )
  ]
);

export const inquiryFormAnswers = pgTable(
  "inquiry_form_answers",
  {
    id: text("id").primaryKey(),
    enquiryId: text("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    questionId: text("question_id")
      .notNull()
      .references(() => inquiryFormQuestions.id),
    answerValue: text("answer_value").notNull(),
    answerLabel: text("answer_label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("inquiry_form_answers_enquiry_question_uidx").on(table.enquiryId, table.questionId)]
);
