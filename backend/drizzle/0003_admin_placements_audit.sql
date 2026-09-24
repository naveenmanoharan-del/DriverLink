CREATE TYPE "public"."contract_type" AS ENUM('gc', 'pmc', 'pgms', 'pssa', 'ae', 'ie', 'other');--> statement-breakpoint
CREATE TYPE "public"."pipeline_status" AS ENUM('new', 'shortlisted', 'interviewed', 'placed', 'on_hold', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."placement_status" AS ENUM('active', 'completed', 'terminated');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_label" varchar(255) NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" uuid,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid,
	"candidate_name" varchar(255) NOT NULL,
	"client_id" uuid,
	"company_name" varchar(255) NOT NULL,
	"position" varchar(255) NOT NULL,
	"project_name" varchar(255),
	"contract_type" "contract_type" DEFAULT 'other' NOT NULL,
	"sector" varchar(20),
	"location" varchar(255),
	"start_date" date NOT NULL,
	"end_date" date,
	"monthly_remuneration" numeric(14, 2),
	"status" "placement_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"application_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placements_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "pipeline_status" "pipeline_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_worker_id_worker_profiles_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "placements_worker_idx" ON "placements" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "placements_company_idx" ON "placements" USING btree ("company_name");