CREATE TABLE "architecture_drifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"base_snapshot_id" uuid NOT NULL,
	"compared_snapshot_id" uuid,
	"drift_category" text NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"semantic_changes" jsonb NOT NULL,
	"severity" text NOT NULL,
	"confidence" text NOT NULL,
	"user_decision" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "architecture_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"document_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"creation_reason" text NOT NULL,
	"created_by_user_id" uuid,
	"previous_snapshot_id" uuid,
	"semantic_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"account_or_project_id" text NOT NULL,
	"role_arn_or_service_account" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_discovered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_discovery_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"discovered_asset_count" integer DEFAULT 0 NOT NULL,
	"matched_asset_count" integer DEFAULT 0 NOT NULL,
	"unmanaged_asset_count" integer DEFAULT 0 NOT NULL,
	"proposal_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_infrastructure_prs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"repository_connection_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"pr_number" integer NOT NULL,
	"pr_url" text NOT NULL,
	"branch_name" text NOT NULL,
	"target_branch" text DEFAULT 'main' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_pr_analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"repository_connection_id" uuid NOT NULL,
	"pr_number" integer NOT NULL,
	"pr_title" text NOT NULL,
	"pr_author" text NOT NULL,
	"head_sha" text NOT NULL,
	"base_sha" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"architecture_risk" text DEFAULT 'none' NOT NULL,
	"proposal_id" uuid,
	"impact_summary" jsonb NOT NULL,
	"comment_posted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"telemetry_source_id" uuid NOT NULL,
	"component_id" text NOT NULL,
	"metric_name" text NOT NULL,
	"value" double precision NOT NULL,
	"unit" text NOT NULL,
	"sampled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_sampled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "architecture_drifts" ADD CONSTRAINT "architecture_drifts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_drifts" ADD CONSTRAINT "architecture_drifts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_drifts" ADD CONSTRAINT "architecture_drifts_base_snapshot_id_architecture_snapshots_id_fk" FOREIGN KEY ("base_snapshot_id") REFERENCES "public"."architecture_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_drifts" ADD CONSTRAINT "architecture_drifts_compared_snapshot_id_architecture_snapshots_id_fk" FOREIGN KEY ("compared_snapshot_id") REFERENCES "public"."architecture_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_snapshots" ADD CONSTRAINT "architecture_snapshots_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_snapshots" ADD CONSTRAINT "architecture_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_snapshots" ADD CONSTRAINT "architecture_snapshots_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_connections" ADD CONSTRAINT "cloud_connections_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_discovery_runs" ADD CONSTRAINT "cloud_discovery_runs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_discovery_runs" ADD CONSTRAINT "cloud_discovery_runs_connection_id_cloud_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."cloud_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_discovery_runs" ADD CONSTRAINT "cloud_discovery_runs_proposal_id_architecture_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."architecture_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_infrastructure_prs" ADD CONSTRAINT "generated_infrastructure_prs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_infrastructure_prs" ADD CONSTRAINT "generated_infrastructure_prs_repository_connection_id_connected_repositories_id_fk" FOREIGN KEY ("repository_connection_id") REFERENCES "public"."connected_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_infrastructure_prs" ADD CONSTRAINT "generated_infrastructure_prs_proposal_id_architecture_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."architecture_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_analysis_runs" ADD CONSTRAINT "github_pr_analysis_runs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_analysis_runs" ADD CONSTRAINT "github_pr_analysis_runs_repository_connection_id_connected_repositories_id_fk" FOREIGN KEY ("repository_connection_id") REFERENCES "public"."connected_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_analysis_runs" ADD CONSTRAINT "github_pr_analysis_runs_proposal_id_architecture_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."architecture_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_metrics" ADD CONSTRAINT "telemetry_metrics_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_metrics" ADD CONSTRAINT "telemetry_metrics_telemetry_source_id_telemetry_sources_id_fk" FOREIGN KEY ("telemetry_source_id") REFERENCES "public"."telemetry_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_sources" ADD CONSTRAINT "telemetry_sources_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_sources" ADD CONSTRAINT "telemetry_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;