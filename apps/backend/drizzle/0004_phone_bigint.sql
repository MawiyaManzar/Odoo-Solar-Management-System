-- Dev/test rows sometimes stored alphanumeric phones; normalize before bigint cast.
DELETE FROM "customer_otps" WHERE "phone" !~ '^[0-9]+$';
--> statement-breakpoint
DELETE FROM "customer_accounts" WHERE "phone" !~ '^[0-9]+$';
--> statement-breakpoint
UPDATE "users" SET "phone" = NULL WHERE "phone" IS NOT NULL AND "phone" !~ '^[0-9]+$';
--> statement-breakpoint
WITH bad AS (
  SELECT id, row_number() OVER (ORDER BY id) AS n
  FROM "customers"
  WHERE "phone" !~ '^[0-9]+$'
)
UPDATE "customers" AS c
SET "phone" = (9000000000 + bad.n)::text
FROM bad
WHERE c.id = bad.id;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" TYPE bigint USING "phone"::bigint;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" TYPE bigint USING NULLIF(trim("phone"), '')::bigint;--> statement-breakpoint
ALTER TABLE "customer_accounts" ALTER COLUMN "phone" TYPE bigint USING "phone"::bigint;--> statement-breakpoint
ALTER TABLE "customer_otps" ALTER COLUMN "phone" TYPE bigint USING "phone"::bigint;
