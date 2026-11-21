CREATE TABLE "customer_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_id" text NOT NULL,
  "phone" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customer_accounts_customer_id_unique" UNIQUE("customer_id"),
  CONSTRAINT "customer_accounts_phone_unique" UNIQUE("phone")
);

CREATE TABLE "customer_otps" (
  "id" text PRIMARY KEY NOT NULL,
  "phone" text NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
