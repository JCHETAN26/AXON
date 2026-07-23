ALTER TABLE "beta_invites" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "beta_invites" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "beta_invites" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
-- Legacy plaintext invitations predate token hashing and cannot be converted to
-- a redeemable hash here (a raw token must never be re-derived from storage).
-- They are preserved for history but invalidated with a non-redeemable sentinel:
-- no real token can hash to this value, so the row can never be redeemed. New
-- invitations must be issued via `beta:invite`.
UPDATE "beta_invites" SET "token_hash" = 'legacy:' || "id"::text WHERE "token_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "beta_invites" ALTER COLUMN "token_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_token_hash_unique" UNIQUE("token_hash");--> statement-breakpoint
ALTER TABLE "beta_invites" DROP COLUMN "code";
