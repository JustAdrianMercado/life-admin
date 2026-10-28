ALTER TABLE "expenses" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "amount_local" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "payment_method" text;