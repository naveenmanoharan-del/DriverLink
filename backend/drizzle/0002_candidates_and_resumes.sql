CREATE TYPE "public"."worker_background" AS ENUM('retired_railway', 'retired_govt', 'private_sector');--> statement-breakpoint
ALTER TYPE "public"."category_group" ADD VALUE 'key_personnel';--> statement-breakpoint
ALTER TYPE "public"."category_group" ADD VALUE 'technical_staff';--> statement-breakpoint
ALTER TYPE "public"."category_group" ADD VALUE 'support_staff';--> statement-breakpoint
ALTER TYPE "public"."rate_unit" ADD VALUE 'month';--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_worker_id_unique" UNIQUE("worker_id")
);
--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "background" "worker_background";--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "sectors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "qualification" varchar(255);--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "last_designation" varchar(255);--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "last_organisation" varchar(255);--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "retirement_year" integer;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_worker_id_worker_profiles_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("id") ON DELETE cascade ON UPDATE no action;