ALTER TABLE "local_agent_connections" ADD COLUMN "credential_hash" text;--> statement-breakpoint
ALTER TABLE "local_agent_connections" ADD COLUMN "credential_issued_at" timestamp;
