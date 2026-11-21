import bcrypt from "bcryptjs";
import { db } from "../client.js";
import { closePool } from "../pool.js";
import { packageItems, packages, products } from "../schema/catalog.js";
import { customers } from "../schema/customers.js";
import { enquiries, siteSurveys } from "../schema/enquiries.js";
import { installations } from "../schema/installations.js";
import { dispatches, serialUnits, stockLevels } from "../schema/inventory.js";
import { orders, payments } from "../schema/orders.js";
import { warrantyPolicies, warranties } from "../schema/phase2.js";
import { quoteLines, quotes } from "../schema/quotes.js";
import { records } from "../schema/records.js";
import { users } from "../schema/users.js";
import { DEV_PASSWORD, starterRecordsSeedData, starterUsersSeedData } from "./starter.seed.js";
import {
  sunpowerCustomer,
  sunpowerDispatch,
  sunpowerEnquiry,
  sunpowerInstallation,
  sunpowerOrder,
  sunpowerPackage,
  sunpowerPackageItems,
  sunpowerPayments,
  sunpowerProducts,
  sunpowerQuote,
  sunpowerQuoteLines,
  sunpowerSerialUnits,
  sunpowerStockLevels,
  sunpowerSurvey,
  sunpowerWarrantyPolicies
} from "./sunpower.seed.js";

export async function runDatabaseSeed(): Promise<void> {
  console.log("[seed] writing SunPower users, catalog, and demo job");
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const deliveredAt = new Date("2026-03-08T10:00:00+05:30");
  const installStart = new Date("2026-03-10T09:00:00+05:30");
  const installEnd = new Date("2026-03-10T16:30:00+05:30");
  const signedAt = new Date("2026-03-10T16:35:00+05:30");

  for (const user of starterUsersSeedData) {
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        passwordHash,
        name: user.name,
        companyName: "SunPower Solutions",
        role: user.role,
        phone: user.phone ?? null,
        isActive: true
      })
      .onConflictDoNothing({ target: users.email });
  }

  for (const record of starterRecordsSeedData) {
    await db
      .insert(records)
      .values({
        id: record.id,
        title: record.title,
        category: record.category,
        status: record.status,
        value: record.value,
        updatedAt: new Date(record.updatedAt)
      })
      .onConflictDoNothing({ target: records.id });
  }

  await db.insert(customers).values(sunpowerCustomer).onConflictDoNothing({ target: customers.id });

  for (const product of sunpowerProducts) {
    await db
      .insert(products)
      .values({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unitPriceInr: product.unitPriceInr,
        unitCostInr: product.unitCostInr,
        isSerialized: product.isSerialized,
        defaultWarrantyMonths: product.defaultWarrantyMonths
      })
      .onConflictDoNothing({ target: products.id });
  }

  await db
    .insert(packages)
    .values(sunpowerPackage)
    .onConflictDoNothing({ target: packages.id });

  for (const item of sunpowerPackageItems) {
    await db.insert(packageItems).values(item).onConflictDoNothing({ target: packageItems.id });
  }

  for (const level of sunpowerStockLevels) {
    await db.insert(stockLevels).values(level).onConflictDoNothing({ target: stockLevels.id });
  }

  for (const policy of sunpowerWarrantyPolicies) {
    await db
      .insert(warrantyPolicies)
      .values({
        id: policy.id,
        productId: policy.productId,
        category: policy.category,
        name: policy.name,
        durationMonths: policy.durationMonths,
        coversParts: true,
        coversLabour: true,
        isActive: true
      })
      .onConflictDoNothing({ target: warrantyPolicies.id });
  }

  await db
    .insert(enquiries)
    .values({
      ...sunpowerEnquiry,
      updatedAt: new Date()
    })
    .onConflictDoNothing({ target: enquiries.id });

  await db
    .insert(siteSurveys)
    .values({
      ...sunpowerSurvey,
      scheduledAt: new Date("2026-03-02T11:00:00+05:30"),
      completedAt: new Date("2026-03-02T12:30:00+05:30")
    })
    .onConflictDoNothing({ target: siteSurveys.id });

  await db
    .insert(quotes)
    .values({
      ...sunpowerQuote,
      validUntil: "2026-03-31",
      updatedAt: new Date()
    })
    .onConflictDoNothing({ target: quotes.id });

  for (const line of sunpowerQuoteLines) {
    await db.insert(quoteLines).values(line).onConflictDoNothing({ target: quoteLines.id });
  }

  await db
    .insert(orders)
    .values({
      ...sunpowerOrder,
      scheduledInstallAt: installStart,
      updatedAt: new Date()
    })
    .onConflictDoNothing({ target: orders.id });

  for (const payment of sunpowerPayments) {
    await db.insert(payments).values(payment).onConflictDoNothing({ target: payments.id });
  }

  await db
    .insert(dispatches)
    .values({
      ...sunpowerDispatch,
      dispatchedAt: new Date("2026-03-08T08:00:00+05:30"),
      deliveredAt
    })
    .onConflictDoNothing({ target: dispatches.id });

  for (const unit of sunpowerSerialUnits) {
    await db
      .insert(serialUnits)
      .values({
        id: unit.id,
        productId: unit.productId,
        serialNumber: unit.serialNumber,
        status: unit.status,
        orderId: unit.orderId,
        dispatchId: unit.dispatchId,
        deliveredAt: unit.dispatchId ? deliveredAt : null
      })
      .onConflictDoNothing({ target: serialUnits.id });
  }

  await db
    .insert(installations)
    .values({
      ...sunpowerInstallation,
      startedAt: installStart,
      finishedAt: installEnd,
      customerSignedAt: signedAt
    })
    .onConflictDoNothing({ target: installations.id });

  // Phase-2 sample warranties for installed serials (clock started at delivery).
  const warrantyRows = [
    {
      id: "war-inv-01",
      serialUnitId: "ser-inv-01",
      policyId: "wpol-inverter",
      orderId: "ord-01",
      startsAt: deliveredAt,
      endsAt: new Date("2028-03-08T10:00:00+05:30"),
      status: "active" as const
    },
    {
      id: "war-pnl-01",
      serialUnitId: "ser-pnl-01",
      policyId: "wpol-panel",
      orderId: "ord-01",
      startsAt: deliveredAt,
      endsAt: new Date("2046-03-08T10:00:00+05:30"),
      status: "active" as const
    }
  ];
  for (const row of warrantyRows) {
    await db.insert(warranties).values(row).onConflictDoNothing({ target: warranties.id });
  }

  console.log(`[seed] users ready: ${starterUsersSeedData.length}`);
  console.log(`[seed] records ready: ${starterRecordsSeedData.length}`);
  console.log("[seed] demo job: cus-01 / enq-01 / quo-01 / ord-01 (completed)");
  console.log(`[seed] demo password: ${DEV_PASSWORD}`);
}

const invoked = (process.argv[1] ?? "").replaceAll("\\", "/");
if (invoked.endsWith("seeds/index.ts") || invoked.endsWith("seeds/index.js")) {
  runDatabaseSeed()
    .then(() => closePool())
    .catch(async (error: unknown) => {
      console.error("[seed] failed", error);
      await closePool();
      process.exit(1);
    });
}
