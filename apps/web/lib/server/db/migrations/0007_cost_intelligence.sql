CREATE TABLE "cost_usage_assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"component_id" text NOT NULL,
	"unit" text NOT NULL,
	"value" double precision NOT NULL,
	"source" text NOT NULL,
	"time_window" text NOT NULL,
	"confidence" text NOT NULL,
	"derivation" text NOT NULL,
	"user_override" boolean DEFAULT false NOT NULL,
	"observed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_estimate_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"region" text NOT NULL,
	"model_version" text NOT NULL,
	"pricing_catalog_version" text NOT NULL,
	"pricing_effective_date" text NOT NULL,
	"usage_profile" jsonb NOT NULL,
	"baseline_estimate" jsonb NOT NULL,
	"scale_projections" jsonb,
	"low_monthly" double precision NOT NULL,
	"expected_monthly" double precision NOT NULL,
	"high_monthly" double precision NOT NULL,
	"confidence" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cost_usage_assumptions" ADD CONSTRAINT "cost_usage_assumptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cost_usage_assumptions" ADD CONSTRAINT "cost_usage_assumptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cost_estimate_runs" ADD CONSTRAINT "cost_estimate_runs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cost_estimate_runs" ADD CONSTRAINT "cost_estimate_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "cost_usage_assumptions_owner_project_component_unit_idx" ON "cost_usage_assumptions" USING btree ("owner_id","project_id","component_id","unit");
