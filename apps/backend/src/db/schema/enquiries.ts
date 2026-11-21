import { sql } from "drizzle-orm";
import { boolean, check, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers.js";
import { users } from "./users.js";

export const ENQUIRY_SOURCES = ["web_form", "whatsapp", "call"] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const ENQUIRY_SYSTEM_KINDS = ["on_grid", "off_grid"] as const;
export type EnquirySystemKind = (typeof ENQUIRY_SYSTEM_KINDS)[number];

export const ENQUIRY_STATUSES = [
  "new",
  "qualifying",
  "survey_scheduled",
  "survey_done",
  "quoted",
  "won",
  "lost"
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const SURVEY_RESULTS = ["approved", "rejected", "pending"] as const;
export type SurveyResult = (typeof SURVEY_RESULTS)[number];

export const enquiries = pgTable(
  "enquiries",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    source: text("source").notNull(),
    requestedKw: numeric("requested_kw", { precision: 4, scale: 1, mode: "number" }).notNull(),
    systemKind: text("system_kind"),
    wantsSubsidy: boolean("wants_subsidy").notNull().default(false),
    monthlyBillInr: numeric("monthly_bill_inr", { precision: 12, scale: 2, mode: "number" }),
    roofAreaSqft: numeric("roof_area_sqft", { precision: 10, scale: 2, mode: "number" }),
    gridSuitable: boolean("grid_suitable"),
    status: text("status").notNull(),
    assignedTo: text("assigned_to").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("enquiries_source_check", sql`${table.source} in ('web_form', 'whatsapp', 'call')`),
    check(
      "enquiries_system_kind_check",
      sql`${table.systemKind} is null or ${table.systemKind} in ('on_grid', 'off_grid')`
    ),
    check(
      "enquiries_status_check",
      sql`${table.status} in ('new', 'qualifying', 'survey_scheduled', 'survey_done', 'quoted', 'won', 'lost')`
    )
  ]
);

export const siteSurveys = pgTable(
  "site_surveys",
  {
    id: text("id").primaryKey(),
    enquiryId: text("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    technicianId: text("technician_id").references(() => users.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    roofDirection: text("roof_direction"),
    tiltDegrees: numeric("tilt_degrees", { precision: 5, scale: 2, mode: "number" }),
    cableDistanceM: numeric("cable_distance_m", { precision: 8, scale: 2, mode: "number" }),
    usableAreaSqft: numeric("usable_area_sqft", { precision: 10, scale: 2, mode: "number" }),
    shadowNotes: text("shadow_notes"),
    result: text("result"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "site_surveys_result_check",
      sql`${table.result} is null or ${table.result} in ('approved', 'rejected', 'pending')`
    )
  ]
);
