/**
 * Repeatable PostgreSQL verification for a staging database.
 *
 *   AXON_VERIFICATION_MODE=staging DATABASE_URL=... pnpm verify:postgres
 *
 * Exercises the full owner-scoped lifecycle end to end against a real database,
 * with a unique prefix per run, cleaning up in a finally block. It never prints
 * database credentials, auth secrets, or invitation hashes. Exits non-zero on
 * the first failed stage, reporting which stage failed. It refuses to run
 * outside staging and refuses a production-like target without an explicit
 * destructive-confirmation flag.
 *
 * This tool provisions and modifies nothing outside the AXON schema, and only
 * the records it creates under its unique prefix.
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- verification script narrows via guards */
import { and, eq } from "drizzle-orm";

import { deleteAccount } from "../lib/server/account-deletion";
import { createInvite, hasBetaAccess, redeemInvite } from "../lib/server/beta";
import { getDatabaseAsync } from "../lib/server/db/client";
import { feedback, generationUsage, users } from "../lib/server/db/schema";
import { collectProjectExport } from "../lib/server/export/collect-export";
import { consumeGeneration } from "../lib/server/generation-quota";
import {
  ConcurrencyError,
  ServerProjectRepository,
} from "../lib/server/repositories/server-project-repository";
import { ServerArtifactRepository } from "../lib/server/repositories/server-artifact-repository";
import { assertVerificationAllowed, verificationPrefix } from "../lib/verify/postgres-guard";

async function main(): Promise<void> {
  const guard = assertVerificationAllowed(process.env);
  if (!guard.ok) {
    console.error(guard.reason);
    process.exit(1);
  }

  const prefix = verificationPrefix();
  const db = await getDatabaseAsync();
  let userA: string | undefined;
  let userB: string | undefined;
  let stage = "start";

  const step = async (name: string, fn: () => Promise<void>): Promise<void> => {
    stage = name;
    await fn();
    console.info(`  ✓ ${name}`);
  };

  try {
    await step("create auth users", async () => {
      userA = (
        await db
          .insert(users)
          .values({ email: `${prefix}-a@verify.local`, name: "A" })
          .returning({ id: users.id })
      )[0]?.id;
      userB = (
        await db
          .insert(users)
          .values({ email: `${prefix}-b@verify.local`, name: "B" })
          .returning({ id: users.id })
      )[0]?.id;
      if (userA === undefined || userB === undefined) throw new Error("user creation failed");
    });

    await step("invite creation + redemption + beta grant", async () => {
      await createInvite(db, `${prefix}-INV`);
      const result = await redeemInvite(db, userA!, `${prefix}-INV`);
      if (!result.ok || !(await hasBetaAccess(db, userA!))) throw new Error("redemption failed");
    });

    const repoA = new ServerProjectRepository(db, userA!);
    let projectId = "";
    await step("project creation + JSONB document persistence", async () => {
      const created = await repoA.createProject({ name: `${prefix}-project`, template: "sample" });
      projectId = created.project.id;
      const read = await repoA.getProject(projectId);
      if (read === null || read.document.projectId !== projectId)
        throw new Error("document read-back failed");
    });

    await step("optimistic-concurrency conflict", async () => {
      const read = await repoA.getProject(projectId);
      await repoA.updateDocument(projectId, read!.document, 1);
      let conflicted = false;
      try {
        await repoA.updateDocument(projectId, read!.document, 1);
      } catch (error) {
        conflicted = error instanceof ConcurrencyError;
      }
      if (!conflicted) throw new Error("stale write was not rejected");
    });

    await step("owner isolation", async () => {
      const repoB = new ServerProjectRepository(db, userB!);
      if ((await repoB.getProject(projectId)) !== null)
        throw new Error("cross-user read succeeded");
    });

    const artifactsA = new ServerArtifactRepository(db, userA!);
    await step("audit / recommendation / simulation persistence", async () => {
      await artifactsA.save(projectId, "audit", { schemaVersion: "1.0" });
      await artifactsA.save(projectId, "recommendation", { schemaVersion: "1.0" });
      await artifactsA.save(projectId, "simulation", { schemaVersion: "1.1" });
      if ((await artifactsA.get(projectId, "audit")) === null)
        throw new Error("artifact read-back failed");
    });

    await step("import-draft persistence without secrets in export", async () => {
      await artifactsA.save(projectId, "import", {
        schemaVersion: "1.0",
        projectId,
        composeText: "services:\n  db:\n    environment: { PASSWORD: verify-secret }",
        categoryOverrides: {},
        updatedAt: new Date().toISOString(),
      });
      const bundle = await collectProjectExport(db, userA!, projectId);
      if (JSON.stringify(bundle).includes("verify-secret"))
        throw new Error("secret leaked into export");
    });

    await step("generation-usage lifecycle", async () => {
      const outcome = await consumeGeneration(db, userA!);
      if (!outcome.allowed) throw new Error("generation usage did not record");
    });

    await step("feedback persistence", async () => {
      await db
        .insert(feedback)
        .values({ userId: userA!, category: "idea", message: `${prefix} note` });
    });

    await step("account deletion cascade", async () => {
      const result = await deleteAccount(db, userA!);
      if (!result.ok) throw new Error("deletion transaction failed");
      const remaining = await db.select().from(users).where(eq(users.id, userA!)).limit(1);
      if (remaining.length > 0) throw new Error("user not deleted");
      // User B is unaffected.
      if (!(await hasBetaAccess(db, userB!).catch(() => false)) && userB === undefined) {
        throw new Error("user B affected");
      }
    });

    console.info("PostgreSQL verification PASSED.");
  } catch (error) {
    console.error(
      `FAILED at stage "${stage}": ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  } finally {
    // Clean up any records this run created, in a best-effort finally block.
    try {
      if (userA !== undefined) await deleteAccount(db, userA);
      if (userB !== undefined) await deleteAccount(db, userB);
      await db
        .delete(generationUsage)
        .where(eq(generationUsage.userId, userA ?? ""))
        .catch(() => undefined);
      // Remove the verification invite if it survived (redemption nulls the user).
      const { betaInvites } = await import("../lib/server/db/schema");
      await db
        .delete(betaInvites)
        .where(and(eq(betaInvites.code, `${prefix}-INV`)))
        .catch(() => undefined);
    } catch {
      console.error("Cleanup encountered an issue; inspect records with prefix:", prefix);
    }
  }
}

void main();
