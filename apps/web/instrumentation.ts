/**
 * Next.js startup hook. Validates the deployment configuration once, on the
 * Node.js server runtime, so a misconfigured production deployment fails closed
 * at boot rather than serving in an unsafe state. The edge runtime is skipped
 * (it has no access to server secrets and runs the same validated config).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertDeploymentConfig } = await import("@/lib/server/production-config");
  assertDeploymentConfig();
}
