ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_method_check";
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_method_check" CHECK ("payments"."method" is null or "payments"."method" in ('upi', 'neft', 'cash', 'cheque', 'stripe'));
