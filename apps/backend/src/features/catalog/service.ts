import { and, asc, eq } from "drizzle-orm";
import type { CustomerResult, EnquiryResult, PackageItemResult, PackageResult, ProductResult } from "../../contracts/results.js";
import { db } from "../../db/client.js";
import { packageItems, packages, products, type PackageSystemKind, type ProductCategory } from "../../db/schema/catalog.js";
import { customers, type CustomerType } from "../../db/schema/customers.js";
import { enquiries, type EnquirySystemKind } from "../../db/schema/enquiries.js";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import { isUniqueViolation } from "../../lib/validate.js";
import { insertInquiryAnswers, resolveInquiryAnswers } from "../inquiry-form/service.js";
import type { PackageInput, PackagePatch, ProductInput, ProductPatch, PublicEnquiryInput } from "./schema.js";

function toProduct(row: typeof products.$inferSelect): ProductResult {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category as ProductCategory,
    unit: row.unit,
    unitPriceInr: row.unitPriceInr,
    unitCostInr: row.unitCostInr,
    isSerialized: row.isSerialized,
    defaultWarrantyMonths: row.defaultWarrantyMonths,
    isActive: row.isActive
  };
}

function toItem(row: typeof packageItems.$inferSelect): PackageItemResult {
  return {
    id: row.id,
    packageId: row.packageId,
    productId: row.productId,
    qty: row.qty
  };
}

function toPackage(row: typeof packages.$inferSelect, items?: PackageItemResult[]): PackageResult {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    systemKind: row.systemKind as PackageSystemKind,
    capacityKw: row.capacityKw,
    basePriceInr: row.basePriceInr,
    isActive: row.isActive,
    ...(items ? { items } : {})
  };
}

function toCustomer(row: typeof customers.$inferSelect): CustomerResult {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    addressLine: row.addressLine,
    city: row.city,
    pincode: row.pincode,
    customerType: row.customerType as CustomerType,
    createdAt: row.createdAt.toISOString()
  };
}

function toEnquiry(row: typeof enquiries.$inferSelect): EnquiryResult {
  return {
    id: row.id,
    customerId: row.customerId,
    source: row.source as EnquiryResult["source"],
    requestedKw: row.requestedKw,
    systemKind: (row.systemKind as EnquirySystemKind | null) ?? null,
    wantsSubsidy: row.wantsSubsidy,
    monthlyBillInr: row.monthlyBillInr,
    roofAreaSqft: row.roofAreaSqft,
    gridSuitable: row.gridSuitable,
    status: row.status as EnquiryResult["status"],
    assignedTo: row.assignedTo,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

async function itemsFor(packageId: string): Promise<PackageItemResult[]> {
  const rows = await db.select().from(packageItems).where(eq(packageItems.packageId, packageId)).orderBy(asc(packageItems.id));
  return rows.map(toItem);
}

async function assertProductsExist(productIds: string[]): Promise<void> {
  const unique = [...new Set(productIds)];
  const rows = await db.select({ id: products.id }).from(products);
  const known = new Set(rows.map((row) => row.id));
  const missing = unique.filter((id) => !known.has(id));
  if (missing.length > 0) {
    throw new ServiceError(400, `Unknown product: ${missing[0]}`);
  }
}

/** Kind + capacity → stable codes like OG-3KW (matches seed style). */
const SYSTEM_KIND_CODE: Record<PackageSystemKind, string> = {
  on_grid: "OG",
  off_grid: "OFF",
  panel_set: "PS",
  installation_only: "IO"
};

function packageCodeBase(systemKind: PackageSystemKind, capacityKw: number | null | undefined): string {
  const prefix = SYSTEM_KIND_CODE[systemKind];
  if (capacityKw == null) return prefix;
  const capacity = Number.isInteger(capacityKw) ? String(capacityKw) : String(capacityKw);
  return `${prefix}-${capacity}KW`;
}

async function nextPackageCode(
  systemKind: PackageSystemKind,
  capacityKw: number | null | undefined,
  options?: { excludeCode?: string }
): Promise<string> {
  const base = packageCodeBase(systemKind, capacityKw);
  const rows = await db.select({ code: packages.code }).from(packages);
  const used = new Set(rows.map((row) => row.code).filter((code) => code !== options?.excludeCode));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function listProducts(query: { category?: ProductCategory; active?: "true" | "false" }): Promise<ProductResult[]> {
  const filters = [];
  if (query.category) filters.push(eq(products.category, query.category));
  if (query.active === "true") filters.push(eq(products.isActive, true));
  if (query.active === "false") filters.push(eq(products.isActive, false));
  const rows = filters.length
    ? await db.select().from(products).where(and(...filters)).orderBy(asc(products.sku))
    : await db.select().from(products).orderBy(asc(products.sku));
  return rows.map(toProduct);
}

export async function getProduct(id: string): Promise<ProductResult> {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) throw new ServiceError(404, "Product not found.");
  return toProduct(row);
}

export async function createProduct(input: ProductInput): Promise<ProductResult> {
  try {
    const [row] = await db
      .insert(products)
      .values({
        id: newId(ID_PREFIXES.product),
        sku: input.sku,
        name: input.name,
        category: input.category,
        unit: input.unit ?? "pcs",
        unitPriceInr: input.unitPriceInr,
        unitCostInr: input.unitCostInr ?? 0,
        isSerialized: input.isSerialized ?? false,
        defaultWarrantyMonths: input.defaultWarrantyMonths ?? null,
        isActive: input.isActive ?? true
      })
      .returning();
    return toProduct(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(409, "A product with this SKU already exists.");
    throw error;
  }
}

export async function updateProduct(id: string, input: ProductPatch): Promise<ProductResult> {
  const current = await getProduct(id);
  try {
    const [row] = await db
      .update(products)
      .set({
        sku: input.sku ?? current.sku,
        name: input.name ?? current.name,
        category: input.category ?? current.category,
        unit: input.unit ?? current.unit,
        unitPriceInr: input.unitPriceInr ?? current.unitPriceInr,
        unitCostInr: input.unitCostInr ?? current.unitCostInr,
        isSerialized: input.isSerialized ?? current.isSerialized,
        defaultWarrantyMonths: input.defaultWarrantyMonths === undefined ? current.defaultWarrantyMonths : input.defaultWarrantyMonths,
        isActive: input.isActive ?? current.isActive
      })
      .where(eq(products.id, id))
      .returning();
    return toProduct(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(409, "A product with this SKU already exists.");
    throw error;
  }
}

export async function listPackages(activeOnly: boolean): Promise<PackageResult[]> {
  const rows = activeOnly
    ? await db.select().from(packages).where(eq(packages.isActive, true)).orderBy(asc(packages.code))
    : await db.select().from(packages).orderBy(asc(packages.code));
  return rows.map((row) => toPackage(row));
}

export async function getPackage(id: string, options?: { activeOnly?: boolean }): Promise<PackageResult> {
  const [row] = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
  if (!row || (options?.activeOnly && !row.isActive)) {
    throw new ServiceError(404, "Package not found.");
  }
  return toPackage(row, await itemsFor(id));
}

export async function createPackage(input: PackageInput): Promise<PackageResult> {
  await assertProductsExist(input.items.map((item) => item.productId));
  const code = await nextPackageCode(input.systemKind, input.capacityKw ?? null);
  try {
    return await db.transaction(async (tx) => {
      const id = newId(ID_PREFIXES.package);
      const [row] = await tx
        .insert(packages)
        .values({
          id,
          code,
          name: input.name,
          systemKind: input.systemKind,
          capacityKw: input.capacityKw ?? null,
          basePriceInr: input.basePriceInr,
          isActive: input.isActive ?? true
        })
        .returning();
      const itemRows = await tx
        .insert(packageItems)
        .values(
          input.items.map((item) => ({
            id: newId(ID_PREFIXES.packageItem),
            packageId: id,
            productId: item.productId,
            qty: item.qty
          }))
        )
        .returning();
      return toPackage(row, itemRows.map(toItem));
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(409, "A package with this code already exists.");
    throw error;
  }
}

export async function updatePackage(id: string, input: PackagePatch): Promise<PackageResult> {
  const current = await getPackage(id);
  if (input.items) await assertProductsExist(input.items.map((item) => item.productId));
  const nextKind = (input.systemKind ?? current.systemKind) as PackageSystemKind;
  const nextCapacity = input.capacityKw === undefined ? current.capacityKw : input.capacityKw;
  const kindOrCapacityChanged =
    (input.systemKind !== undefined && input.systemKind !== current.systemKind) ||
    (input.capacityKw !== undefined && input.capacityKw !== current.capacityKw);
  const code = kindOrCapacityChanged
    ? await nextPackageCode(nextKind, nextCapacity, { excludeCode: current.code })
    : current.code;
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(packages)
        .set({
          code,
          name: input.name ?? current.name,
          systemKind: nextKind,
          capacityKw: nextCapacity,
          basePriceInr: input.basePriceInr ?? current.basePriceInr,
          isActive: input.isActive ?? current.isActive
        })
        .where(eq(packages.id, id))
        .returning();
      let items = current.items ?? [];
      if (input.items) {
        await tx.delete(packageItems).where(eq(packageItems.packageId, id));
        const itemRows = await tx
          .insert(packageItems)
          .values(
            input.items.map((item) => ({
              id: newId(ID_PREFIXES.packageItem),
              packageId: id,
              productId: item.productId,
              qty: item.qty
            }))
          )
          .returning();
        items = itemRows.map(toItem);
      }
      return toPackage(row, items);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(409, "A package with this code already exists.");
    throw error;
  }
}

export async function createPublicEnquiry(input: PublicEnquiryInput): Promise<{ customer: CustomerResult; enquiry: EnquiryResult }> {
  const email = input.email ? input.email : null;
  const mapped = await resolveInquiryAnswers(input.answers ?? []);

  const noteParts = [...mapped.noteLines];
  if (input.notes?.trim()) noteParts.push(input.notes.trim());
  const notes = noteParts.length > 0 ? noteParts.join("\n") : null;

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(customers).where(eq(customers.phone, input.phone)).limit(1);
    let customerRow = existing;
    if (existing) {
      const [updated] = await tx
        .update(customers)
        .set({
          name: input.name,
          email,
          addressLine: input.addressLine,
          city: input.city,
          pincode: input.pincode ?? existing.pincode,
          customerType: input.customerType ?? existing.customerType
        })
        .where(eq(customers.id, existing.id))
        .returning();
      customerRow = updated;
    } else {
      const [created] = await tx
        .insert(customers)
        .values({
          id: newId(ID_PREFIXES.customer),
          name: input.name,
          phone: input.phone,
          email,
          addressLine: input.addressLine,
          city: input.city,
          pincode: input.pincode ?? null,
          customerType: input.customerType ?? "residential"
        })
        .returning();
      customerRow = created;
    }

    const [enquiryRow] = await tx
      .insert(enquiries)
      .values({
        id: newId(ID_PREFIXES.enquiry),
        customerId: customerRow.id,
        source: "web_form",
        requestedKw: mapped.requestedKw ?? input.requestedKw,
        systemKind: mapped.systemKind ?? input.systemKind ?? null,
        wantsSubsidy: mapped.wantsSubsidy ?? input.wantsSubsidy ?? false,
        monthlyBillInr: mapped.monthlyBillInr ?? input.monthlyBillInr ?? null,
        roofAreaSqft: mapped.roofAreaSqft ?? input.roofAreaSqft ?? null,
        gridSuitable: mapped.gridSuitable ?? input.gridSuitable ?? null,
        status: "new",
        notes
      })
      .returning();

    await insertInquiryAnswers(tx, enquiryRow.id, mapped.answerRows);

    return { customer: toCustomer(customerRow), enquiry: toEnquiry(enquiryRow) };
  });
}
