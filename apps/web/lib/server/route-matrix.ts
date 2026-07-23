/**
 * The canonical route-protection matrix. This is the single source of truth for
 * how every application route is classified and gated, kept in code so it can
 * be asserted by tests and reviewed at a glance.
 */

export type RouteClass =
  | "public"
  | "auth" // sign-in and Auth.js callbacks
  | "auth-callback"
  | "invite" // authenticated, not beta-gated
  | "beta-page" // authenticated + beta-gated product page
  | "owner-api" // authenticated + beta + owner-scoped
  | "share-link" // public route authenticated by an unguessable share token
  | "local-agent-api" // local agent bearer credential; no browser session required
  | "github-callback" // authenticated + beta; validates signed single-use state
  | "github-webhook" // public endpoint; authenticated by HMAC signature only
  | "cron" // scheduler-triggered; authenticated by a shared bearer secret only
  | "internal-api" // dev/test only, fail-closed in production
  | "health" // public liveness/readiness
  | "static";

export interface RouteEntry {
  readonly pattern: string;
  readonly class: RouteClass;
  /** Whether the edge proxy requires an authenticated session in cloud mode. */
  readonly proxyProtected: boolean;
  /** Whether the API handler independently enforces auth + beta + ownership. */
  readonly apiEnforced: boolean;
}

export const ROUTE_MATRIX: readonly RouteEntry[] = [
  { pattern: "/", class: "public", proxyProtected: false, apiEnforced: false },
  { pattern: "/design-system", class: "public", proxyProtected: false, apiEnforced: false },
  { pattern: "/privacy", class: "public", proxyProtected: false, apiEnforced: false },
  { pattern: "/terms", class: "public", proxyProtected: false, apiEnforced: false },
  { pattern: "/security", class: "public", proxyProtected: false, apiEnforced: false },
  { pattern: "/data-handling", class: "public", proxyProtected: false, apiEnforced: false },

  { pattern: "/sign-in", class: "auth", proxyProtected: false, apiEnforced: false },
  {
    pattern: "/api/auth/[...nextauth]",
    class: "auth-callback",
    proxyProtected: false,
    apiEnforced: false,
  },

  { pattern: "/invite", class: "invite", proxyProtected: false, apiEnforced: false },
  { pattern: "/api/invite", class: "invite", proxyProtected: false, apiEnforced: true },

  { pattern: "/projects", class: "beta-page", proxyProtected: true, apiEnforced: false },
  { pattern: "/projects/new", class: "beta-page", proxyProtected: true, apiEnforced: false },
  {
    pattern: "/projects/[projectId]",
    class: "beta-page",
    proxyProtected: true,
    apiEnforced: false,
  },
  {
    pattern: "/share/[token]",
    class: "share-link",
    proxyProtected: false,
    apiEnforced: true,
  },
  { pattern: "/account", class: "beta-page", proxyProtected: true, apiEnforced: false },
  {
    pattern: "/settings/connections",
    class: "beta-page",
    proxyProtected: true,
    apiEnforced: false,
  },

  { pattern: "/api/projects", class: "owner-api", proxyProtected: false, apiEnforced: true },
  {
    pattern: "/api/projects/[projectId]",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/artifacts/[kind]",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/approvals",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/approvals/[approvalId]",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/cost/assumptions",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/cost/estimate",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/cost/estimates",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/comments",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/comments/[commentId]",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/export",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/share-links",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/share-links/[shareLinkId]",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/telemetry/metrics",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/projects/[projectId]/telemetry/sources",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/share/[token]",
    class: "share-link",
    proxyProtected: false,
    apiEnforced: true,
  },
  { pattern: "/api/generate", class: "owner-api", proxyProtected: false, apiEnforced: true },
  { pattern: "/api/migrate", class: "owner-api", proxyProtected: false, apiEnforced: true },
  { pattern: "/api/feedback", class: "owner-api", proxyProtected: false, apiEnforced: true },
  { pattern: "/api/account/export", class: "owner-api", proxyProtected: false, apiEnforced: true },
  { pattern: "/api/account", class: "owner-api", proxyProtected: false, apiEnforced: true },
  { pattern: "/api/local-agents", class: "owner-api", proxyProtected: false, apiEnforced: true },
  {
    pattern: "/api/local-agents/[agentId]",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/local-agents/[agentId]/auth",
    class: "local-agent-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/local-agents/[agentId]/sync",
    class: "local-agent-api",
    proxyProtected: false,
    apiEnforced: true,
  },

  { pattern: "/api/connections", class: "owner-api", proxyProtected: false, apiEnforced: true },
  {
    pattern: "/api/connections/github/start",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/connections/github/callback",
    class: "github-callback",
    proxyProtected: false,
    apiEnforced: true,
  },
  {
    pattern: "/api/connections/[connectionId]/repositories",
    class: "owner-api",
    proxyProtected: false,
    apiEnforced: true,
  },

  { pattern: "/api/health", class: "health", proxyProtected: false, apiEnforced: false },
  { pattern: "/api/ready", class: "health", proxyProtected: false, apiEnforced: false },

  // Public endpoint, but authenticated by GitHub's HMAC signature (not a session).
  {
    pattern: "/api/github/webhook",
    class: "github-webhook",
    proxyProtected: false,
    apiEnforced: true,
  },

  // Scheduler-triggered queue drain, authenticated by a shared bearer secret.
  {
    pattern: "/api/jobs/drain",
    class: "cron",
    proxyProtected: false,
    apiEnforced: true,
  },

  {
    pattern: "/api/dev/seed-invite",
    class: "internal-api",
    proxyProtected: false,
    apiEnforced: true,
  },
];

/** Prefixes the edge proxy treats as always public, even in cloud mode. */
export const PROXY_PUBLIC_PREFIXES = [
  "/sign-in",
  "/invite",
  "/api/auth",
  "/api/health",
  "/api/ready",
  "/api/github/webhook",
  "/api/jobs/drain",
  "/api/share",
  "/share",
];

/** Prefixes the edge proxy protects (requires a session) in cloud mode. */
export const PROXY_PROTECTED_PREFIXES = ["/projects", "/account", "/settings"];

/**
 * Validates that a redirect target is a safe same-origin relative path.
 * Rejects protocol-relative (`//host`), absolute external, backslash, and
 * encoded-bypass forms. Shared by sign-in, the proxy, and the page guard.
 */
export function isSafeReturnPath(target: string | null | undefined): boolean {
  if (typeof target !== "string" || target.length === 0) return false;
  if (!target.startsWith("/")) return false;
  if (target.startsWith("//")) return false; // protocol-relative
  if (target.startsWith("/\\") || target.includes("\\")) return false; // backslash tricks
  // Reject encoded slashes that could decode into a protocol-relative path.
  const lowered = target.toLowerCase();
  if (lowered.startsWith("/%2f") || lowered.startsWith("/%5c")) return false;
  try {
    // Resolved against a dummy origin, a safe path must keep that origin.
    const resolved = new URL(target, "https://axon.internal");
    return resolved.origin === "https://axon.internal";
  } catch {
    return false;
  }
}
