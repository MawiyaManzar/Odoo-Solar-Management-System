import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { EnquiryResult, SiteSurveyResult } from "../../contracts/results.js";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { customers } from "../../db/schema/customers.js";
import { enquiries, siteSurveys, type EnquiryStatus } from "../../db/schema/enquiries.js";
import { quotes } from "../../db/schema/quotes.js";
import { users, type UserRole } from "../../db/schema/users.js";
import { isBeforeTodayInIndia } from "../../lib/dates.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import type { EnquiryPatch, SurveyCreate, SurveyPatch } from "./schema.js";

const SURVEY_SCHEDULE_STATUSES = new Set<EnquiryStatus>(["new", "qualifying", "survey_scheduled"]);

export interface EnquiryView extends EnquiryResult {
  customerName: string;
  customerPhone: string;
  addressLine: string;
  city: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function toEnquiry(row: typeof enquiries.$inferSelect, customer: typeof customers.$inferSelect): EnquiryView {
  return {
    id: row.id,
    customerId: row.customerId,
    source: row.source as EnquiryResult["source"],
    requestedKw: row.requestedKw,
    systemKind: row.systemKind as EnquiryResult["systemKind"],
    wantsSubsidy: row.wantsSubsidy,
    monthlyBillInr: row.monthlyBillInr,
    roofAreaSqft: row.roofAreaSqft,
    gridSuitable: row.gridSuitable,
    status: row.status as EnquiryResult["status"],
    assignedTo: row.assignedTo,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customerName: customer.name,
    customerPhone: customer.phone,
    addressLine: customer.addressLine,
    city: customer.city
  };
}

function toSurvey(row: typeof siteSurveys.$inferSelect): SiteSurveyResult {
  return {
    id: row.id,
    enquiryId: row.enquiryId,
    technicianId: row.technicianId,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    roofDirection: row.roofDirection,
    tiltDegrees: row.tiltDegrees,
    cableDistanceM: row.cableDistanceM,
    usableAreaSqft: row.usableAreaSqft,
    shadowNotes: row.shadowNotes,
    result: row.result as SiteSurveyResult["result"],
    createdAt: row.createdAt.toISOString()
  };
}

export async function listStaff(role?: UserRole): Promise<StaffMember[]> {
  const rows = role
    ? await db.select().from(users).where(and(eq(users.role, role), eq(users.isActive, true))).orderBy(asc(users.name))
    : await db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.name));
  return rows.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role as UserRole }));
}

export async function listEnquiries(query: { status?: EnquiryStatus; assignedTo?: string }): Promise<EnquiryView[]> {
  const filters = [];
  if (query.status) filters.push(eq(enquiries.status, query.status));
  if (query.assignedTo) filters.push(eq(enquiries.assignedTo, query.assignedTo));
  const rows = await db
    .select({ enquiry: enquiries, customer: customers })
    .from(enquiries)
    .innerJoin(customers, eq(customers.id, enquiries.customerId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(enquiries.createdAt));
  return rows.map((row) => toEnquiry(row.enquiry, row.customer));
}

export async function getEnquiry(id: string): Promise<EnquiryView> {
  const [row] = await db
    .select({ enquiry: enquiries, customer: customers })
    .from(enquiries)
    .innerJoin(customers, eq(customers.id, enquiries.customerId))
    .where(eq(enquiries.id, id))
    .limit(1);
  if (!row) throw new ServiceError(404, "Enquiry not found.");
  return toEnquiry(row.enquiry, row.customer);
}

export async function updateEnquiry(id: string, input: EnquiryPatch): Promise<EnquiryView> {
  const current = await getEnquiry(id);
  if (input.status === "won") {
    throw new ServiceError(400, "Won is set when a quote is accepted.");
  }
  if (current.status === "won" || current.status === "lost") {
    throw new ServiceError(400, "This enquiry is already closed.");
  }
  const nextStatus = input.status ?? current.status;
  await db.transaction(async (tx) => {
    await tx
      .update(enquiries)
      .set({
        requestedKw: input.requestedKw ?? current.requestedKw,
        systemKind: input.systemKind === undefined ? current.systemKind : input.systemKind,
        wantsSubsidy: input.wantsSubsidy ?? current.wantsSubsidy,
        monthlyBillInr: input.monthlyBillInr === undefined ? current.monthlyBillInr : input.monthlyBillInr,
        roofAreaSqft: input.roofAreaSqft === undefined ? current.roofAreaSqft : input.roofAreaSqft,
        gridSuitable: input.gridSuitable === undefined ? current.gridSuitable : input.gridSuitable,
        notes: input.notes === undefined ? current.notes : input.notes,
        assignedTo: input.assignedTo === undefined ? current.assignedTo : input.assignedTo,
        status: nextStatus,
        updatedAt: new Date()
      })
      .where(eq(enquiries.id, id));
    if (nextStatus === "lost") {
      await tx
        .update(quotes)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(and(eq(quotes.enquiryId, id), inArray(quotes.status, ["draft", "sent"])));
    }
  });
  return getEnquiry(id);
}

export async function listSurveys(enquiryId: string): Promise<SiteSurveyResult[]> {
  await getEnquiry(enquiryId);
  const rows = await db.select().from(siteSurveys).where(eq(siteSurveys.enquiryId, enquiryId)).orderBy(desc(siteSurveys.createdAt));
  return rows.map(toSurvey);
}

export async function createSurvey(enquiryId: string, input: SurveyCreate): Promise<SiteSurveyResult> {
  const enquiry = await getEnquiry(enquiryId);
  if (enquiry.status === "won" || enquiry.status === "lost") {
    throw new ServiceError(400, "This enquiry is already closed.");
  }
  if (input.scheduledAt && isBeforeTodayInIndia(input.scheduledAt)) {
    throw new ServiceError(400, "Survey can only be scheduled from today onwards.");
  }
  const [row] = await db
    .insert(siteSurveys)
    .values({
      id: newId(ID_PREFIXES.siteSurvey),
      enquiryId,
      technicianId: input.technicianId ?? null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      result: "pending"
    })
    .returning();
  if (SURVEY_SCHEDULE_STATUSES.has(enquiry.status as EnquiryStatus)) {
    await db.update(enquiries).set({ status: "survey_scheduled", updatedAt: new Date() }).where(eq(enquiries.id, enquiryId));
  }
  return toSurvey(row);
}

export async function updateSurvey(id: string, input: SurveyPatch): Promise<SiteSurveyResult> {
  const [current] = await db.select().from(siteSurveys).where(eq(siteSurveys.id, id)).limit(1);
  if (!current) throw new ServiceError(404, "Survey not found.");
  const result = input.result ?? current.result;
  const completedAt =
    input.completedAt === undefined
      ? current.completedAt
      : input.completedAt
        ? new Date(input.completedAt)
        : null;
  const finished = result === "approved" || result === "rejected" ? completedAt ?? new Date() : completedAt;
  const [row] = await db
    .update(siteSurveys)
    .set({
      roofDirection: input.roofDirection === undefined ? current.roofDirection : input.roofDirection,
      tiltDegrees: input.tiltDegrees === undefined ? current.tiltDegrees : input.tiltDegrees,
      cableDistanceM: input.cableDistanceM === undefined ? current.cableDistanceM : input.cableDistanceM,
      usableAreaSqft: input.usableAreaSqft === undefined ? current.usableAreaSqft : input.usableAreaSqft,
      shadowNotes: input.shadowNotes === undefined ? current.shadowNotes : input.shadowNotes,
      result,
      completedAt: finished
    })
    .where(eq(siteSurveys.id, id))
    .returning();
  if (result === "approved") {
    await db.update(enquiries).set({ status: "survey_done", updatedAt: new Date() }).where(eq(enquiries.id, current.enquiryId));
  } else if (result === "rejected") {
    const enquiry = await getEnquiry(current.enquiryId);
    if (enquiry.status === "survey_scheduled") {
      await db.update(enquiries).set({ status: "qualifying", updatedAt: new Date() }).where(eq(enquiries.id, current.enquiryId));
    }
  }
  return toSurvey(row);
}

export async function enquiryHasApprovedSurvey(enquiryId: string): Promise<boolean> {
  const rows = await db.select().from(siteSurveys).where(eq(siteSurveys.enquiryId, enquiryId));
  return rows.some((row) => row.result === "approved");
}
