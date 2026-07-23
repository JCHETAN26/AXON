CREATE TABLE "local_synchronized_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"agent_connection_id" uuid NOT NULL,
	"project_id" uuid,
	"local_evidence_id" text NOT NULL,
	"file_path" text NOT NULL,
	"start_line" integer,
	"end_line" integer,
	"evidence_type" text NOT NULL,
	"extractor" text NOT NULL,
	"excerpt" text,
	"fact" jsonb NOT NULL,
	"confidence" text NOT NULL,
	"provenance" text DEFAULT 'locally-observed' NOT NULL,
	"redaction_status" text NOT NULL,
	"local_analysis_version" text NOT NULL,
	"local_workspace_snapshot_id" text NOT NULL,
	"raw_source_retained" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "local_synchronized_evidence" ADD CONSTRAINT "local_synchronized_evidence_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "local_synchronized_evidence" ADD CONSTRAINT "local_synchronized_evidence_sync_run_id_local_evidence_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."local_evidence_sync_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "local_synchronized_evidence" ADD CONSTRAINT "local_synchronized_evidence_agent_connection_id_local_agent_connections_id_fk" FOREIGN KEY ("agent_connection_id") REFERENCES "public"."local_agent_connections"("id") ON DELETE cascade ON UPDATE no action;
