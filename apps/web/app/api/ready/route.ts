/**
 * Readiness. Returns 200 only when the required dependencies are available.
 *
 * - Validates the deployment configuration (fails closed on misconfiguration).
 * - In cloud mode, checks PostgreSQL connectivity and that the core schema is
 *   present, using a short bounded timeout and a trivial query.
 * - In local mode, reports ready truthfully (no database dependency).
 *
 * Never exposes the database hostname, user, URL, schema contents, or a stack
 * trace. Uses `Cache-Control: no-store` and creates no records.
 */
const READINESS_TIMEOUT_MS = 3_000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(): Promise<Response> {
  const { validateDeploymentConfig } = await import("@/lib/server/production-config");
  if (validateDeploymentConfig().length > 0) {
    // Misconfigured deployment is not ready. Do not echo which variables.
    return json({ status: "not-ready", reason: "configuration" }, 503);
  }

  const { isCloudMode } = await import("@/lib/server/persistence-mode");
  if (!isCloudMode()) {
    return json({ status: "ready", mode: "local" }, 200);
  }

  try {
    const [{ getDatabaseAsync }, { sql }] = await Promise.all([
      import("@/lib/server/db/client"),
      import("drizzle-orm"),
    ]);
    const db = await getDatabaseAsync();
    // Cheap check that also confirms the core schema exists.
    await withTimeout(db.execute(sql`select 1 from users limit 1`), READINESS_TIMEOUT_MS);
    return json({ status: "ready", mode: "cloud" }, 200);
  } catch {
    // Connectivity, timeout, or missing schema — not ready. No detail leaked.
    return json({ status: "not-ready", mode: "cloud", reason: "database" }, 503);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}
