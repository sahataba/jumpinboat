ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_book" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_list_boats" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "skipper_included" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "photos" jsonb DEFAULT '[]'::jsonb NOT NULL;
