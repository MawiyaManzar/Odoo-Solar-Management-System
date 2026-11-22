CREATE TABLE "inquiry_form_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"field_type" text NOT NULL,
	"options_json" text,
	"maps_to" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_form_questions_field_type_check" CHECK ("inquiry_form_questions"."field_type" in ('single_choice', 'select', 'text', 'number', 'boolean')),
	CONSTRAINT "inquiry_form_questions_maps_to_check" CHECK ("inquiry_form_questions"."maps_to" is null or "inquiry_form_questions"."maps_to" in ('requestedKw', 'systemKind', 'wantsSubsidy', 'monthlyBillInr', 'roofAreaSqft', 'gridSuitable'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inquiry_form_questions_key_uidx" ON "inquiry_form_questions" USING btree ("key");
--> statement-breakpoint
CREATE TABLE "inquiry_form_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"enquiry_id" text NOT NULL,
	"question_id" text NOT NULL,
	"answer_value" text NOT NULL,
	"answer_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inquiry_form_answers_enquiry_question_uidx" ON "inquiry_form_answers" USING btree ("enquiry_id","question_id");
--> statement-breakpoint
ALTER TABLE "inquiry_form_answers" ADD CONSTRAINT "inquiry_form_answers_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inquiry_form_answers" ADD CONSTRAINT "inquiry_form_answers_question_id_inquiry_form_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."inquiry_form_questions"("id") ON DELETE no action ON UPDATE no action;
