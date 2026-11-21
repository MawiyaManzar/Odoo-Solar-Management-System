CREATE TABLE "records" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"value" numeric(14, 2) DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "records_status_check" CHECK ("records"."status" in ('active', 'pending', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('admin', 'sales', 'warehouse', 'technician', 'support'))
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address_line" text NOT NULL,
	"city" text NOT NULL,
	"pincode" text,
	"customer_type" text DEFAULT 'residential' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone"),
	CONSTRAINT "customers_type_check" CHECK ("customers"."customer_type" in ('residential', 'commercial'))
);
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"product_id" text NOT NULL,
	"qty" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"system_kind" text NOT NULL,
	"capacity_kw" numeric(4, 1),
	"base_price_inr" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "packages_code_unique" UNIQUE("code"),
	CONSTRAINT "packages_system_kind_check" CHECK ("packages"."system_kind" in ('on_grid', 'off_grid', 'panel_set', 'installation_only'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"unit_price_inr" numeric(12, 2) NOT NULL,
	"unit_cost_inr" numeric(12, 2) DEFAULT 0 NOT NULL,
	"is_serialized" boolean DEFAULT false NOT NULL,
	"default_warranty_months" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_category_check" CHECK ("products"."category" in ('panel', 'inverter', 'battery', 'charge_controller', 'mount', 'wiring', 'safety', 'service'))
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"source" text NOT NULL,
	"requested_kw" numeric(4, 1) NOT NULL,
	"system_kind" text,
	"wants_subsidy" boolean DEFAULT false NOT NULL,
	"monthly_bill_inr" numeric(12, 2),
	"roof_area_sqft" numeric(10, 2),
	"grid_suitable" boolean,
	"status" text NOT NULL,
	"assigned_to" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enquiries_source_check" CHECK ("enquiries"."source" in ('web_form', 'whatsapp', 'call')),
	CONSTRAINT "enquiries_system_kind_check" CHECK ("enquiries"."system_kind" is null or "enquiries"."system_kind" in ('on_grid', 'off_grid')),
	CONSTRAINT "enquiries_status_check" CHECK ("enquiries"."status" in ('new', 'qualifying', 'survey_scheduled', 'survey_done', 'quoted', 'won', 'lost'))
);
--> statement-breakpoint
CREATE TABLE "site_surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"enquiry_id" text NOT NULL,
	"technician_id" text,
	"scheduled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"roof_direction" text,
	"tilt_degrees" numeric(5, 2),
	"cable_distance_m" numeric(8, 2),
	"usable_area_sqft" numeric(10, 2),
	"shadow_notes" text,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_surveys_result_check" CHECK ("site_surveys"."result" is null or "site_surveys"."result" in ('approved', 'rejected', 'pending'))
);
--> statement-breakpoint
CREATE TABLE "quote_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"product_id" text NOT NULL,
	"description" text,
	"qty" numeric(10, 2) NOT NULL,
	"unit_price_inr" numeric(12, 2) NOT NULL,
	"line_total_inr" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"enquiry_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"package_id" text,
	"status" text NOT NULL,
	"subtotal_inr" numeric(14, 2) DEFAULT 0 NOT NULL,
	"discount_inr" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total_inr" numeric(14, 2) DEFAULT 0 NOT NULL,
	"valid_until" date,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_status_check" CHECK ("quotes"."status" in ('draft', 'sent', 'accepted', 'rejected', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"enquiry_id" text NOT NULL,
	"status" text NOT NULL,
	"system_kw" numeric(4, 1) NOT NULL,
	"system_kind" text NOT NULL,
	"site_address" text NOT NULL,
	"scheduled_install_at" timestamp with time zone,
	"total_inr" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('awaiting_payment', 'paid', 'packing', 'dispatched', 'installing', 'completed', 'cancelled')),
	CONSTRAINT "orders_system_kind_check" CHECK ("orders"."system_kind" in ('on_grid', 'off_grid'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"amount_inr" numeric(14, 2) NOT NULL,
	"kind" text NOT NULL,
	"method" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reference" text,
	"recorded_by" text,
	CONSTRAINT "payments_kind_check" CHECK ("payments"."kind" in ('advance', 'balance', 'full', 'service')),
	CONSTRAINT "payments_method_check" CHECK ("payments"."method" is null or "payments"."method" in ('upi', 'neft', 'cash', 'cheque'))
);
--> statement-breakpoint
CREATE TABLE "dispatches" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"status" text NOT NULL,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"packed_by" text,
	"vehicle_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispatches_status_check" CHECK ("dispatches"."status" in ('packing', 'in_transit', 'delivered', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "serial_units" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"serial_number" text NOT NULL,
	"status" text NOT NULL,
	"order_id" text,
	"dispatch_id" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "serial_units_serial_number_unique" UNIQUE("serial_number"),
	CONSTRAINT "serial_units_status_check" CHECK ("serial_units"."status" in ('in_stock', 'reserved', 'dispatched', 'installed', 'returned', 'scrapped'))
);
--> statement-breakpoint
CREATE TABLE "stock_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"qty_on_hand" numeric(12, 2) DEFAULT 0 NOT NULL,
	"qty_reserved" numeric(12, 2) DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_levels_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "installations" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"lead_technician_id" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"system_kw_confirmed" numeric(4, 1),
	"generation_test_ok" boolean,
	"customer_signed_at" timestamp with time zone,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installations_status_check" CHECK ("installations"."status" in ('scheduled', 'in_progress', 'completed', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "service_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"order_id" text,
	"serial_unit_id" text,
	"opened_by" text,
	"assigned_to" text,
	"fault_code" text,
	"description" text NOT NULL,
	"under_warranty" boolean,
	"billable_inr" numeric(12, 2) DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"customer_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_tickets_status_check" CHECK ("service_tickets"."status" in ('open', 'in_progress', 'waiting_parts', 'resolved', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "evidences" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"installation_id" text,
	"ticket_id" text,
	"kind" text NOT NULL,
	"storage_url" text NOT NULL,
	"uploaded_by" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidences_kind_check" CHECK ("evidences"."kind" in ('roof_photo', 'earthing_photo', 'customer_signature', 'invoice_scan', 'other'))
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"ticket_id" text,
	"invoice_no" text NOT NULL,
	"kind" text NOT NULL,
	"amount_inr" numeric(14, 2) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "invoices_invoice_no_unique" UNIQUE("invoice_no"),
	CONSTRAINT "invoices_kind_check" CHECK ("invoices"."kind" in ('advance', 'final', 'service')),
	CONSTRAINT "invoices_status_check" CHECK ("invoices"."status" in ('draft', 'sent', 'paid', 'void'))
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"serial_unit_id" text,
	"delta_qty" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"order_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_reason_check" CHECK ("stock_movements"."reason" in ('purchase', 'reserve', 'dispatch', 'return', 'adjust'))
);
--> statement-breakpoint
CREATE TABLE "subsidy_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"scheme_name" text,
	"amount_inr" numeric(14, 2),
	"status" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"notes" text,
	CONSTRAINT "subsidy_claims_status_check" CHECK ("subsidy_claims"."status" in ('not_started', 'docs_pending', 'submitted', 'approved', 'rejected', 'disbursed'))
);
--> statement-breakpoint
CREATE TABLE "technician_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" text NOT NULL,
	"technician_id" text NOT NULL,
	"role_on_job" text,
	"hours_worked" numeric(6, 2),
	CONSTRAINT "technician_assignments_role_check" CHECK ("technician_assignments"."role_on_job" is null or "technician_assignments"."role_on_job" in ('lead', 'helper'))
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" text PRIMARY KEY NOT NULL,
	"serial_unit_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"order_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "warranties_serial_unit_id_unique" UNIQUE("serial_unit_id"),
	CONSTRAINT "warranties_status_check" CHECK ("warranties"."status" in ('active', 'expired', 'void', 'claimed'))
);
--> statement-breakpoint
CREATE TABLE "warranty_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text,
	"category" text,
	"name" text NOT NULL,
	"duration_months" integer NOT NULL,
	"covers_parts" boolean DEFAULT true NOT NULL,
	"covers_labour" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_surveys" ADD CONSTRAINT "site_surveys_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_surveys" ADD CONSTRAINT "site_surveys_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_packed_by_users_id_fk" FOREIGN KEY ("packed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_dispatch_id_dispatches_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_lead_technician_id_users_id_fk" FOREIGN KEY ("lead_technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_serial_unit_id_serial_units_id_fk" FOREIGN KEY ("serial_unit_id") REFERENCES "public"."serial_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_installation_id_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_ticket_id_service_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."service_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_ticket_id_service_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."service_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_serial_unit_id_serial_units_id_fk" FOREIGN KEY ("serial_unit_id") REFERENCES "public"."serial_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsidy_claims" ADD CONSTRAINT "subsidy_claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_installation_id_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_serial_unit_id_serial_units_id_fk" FOREIGN KEY ("serial_unit_id") REFERENCES "public"."serial_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_policy_id_warranty_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."warranty_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_policies" ADD CONSTRAINT "warranty_policies_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;