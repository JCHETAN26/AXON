/**
 * Shared request/response hardening for custom API routes. Centralises method,
 * content-type, same-origin, and payload-size validation so every mutation
 * route enforces the same posture, and provides `no-store` JSON responses for
 * authenticated private data.
 *
 * Auth.js endpoints keep their own CSRF handling and are not routed through
 * this module.
 */

export interface GuardFailure {
  readonly response: Response;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** JSON response for authenticated/private data — never cached. */
export function privateJson(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

/** Named payload limits (bytes / lengths) shared across routes. */
export const PAYLOAD_LIMITS = {
  projectName: 120,
  projectDescription: 2000,
  architectureDocumentBytes: 1_000_000,
  auditBytes: 2_000_000,
  copilotBytes: 1_000_000,
  recommendationBytes: 1_000_000,
  simulationBytes: 1_000_000,
  importDraftBytes: 1_100_000,
  migrationBatch: 200,
  feedbackMessage: 4000,
  generationPrompt: 2000,
  /** Default cap for any JSON request body. */
  requestBodyBytes: 3_000_000,
} as const;

/** Rejects a request whose method is not in the allowed set. */
export function requireMethod(request: Request, allowed: readonly string[]): GuardFailure | null {
  if (allowed.includes(request.method)) return null;
  return {
    response: jsonError(`Method ${request.method} not allowed.`, 405),
  };
}

/**
 * Requires a JSON content type on requests that carry a body. Prevents simple
 * cross-site form submissions (which cannot set application/json) from reaching
 * mutation handlers.
 */
export function requireJsonContentType(request: Request): GuardFailure | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) return null;
  return { response: jsonError("Content-Type must be application/json.", 415) };
}

/**
 * Rejects cross-origin state-changing requests. A browser always sends Origin
 * on such requests; a matching Origin (against the request host or a
 * configured app URL / trusted proxy host) is required. A missing Origin is
 * allowed only for non-browser clients that also present JSON — documented,
 * and still gated by the session cookie which browsers will not attach
 * cross-site under SameSite=Lax for these methods.
 */
export function requireSameOrigin(request: Request): GuardFailure | null {
  const origin = request.headers.get("origin");
  if (origin === null || origin === "") {
    // No Origin header: non-browser client (e.g. curl, server-to-server).
    // Cross-site browsers cannot omit Origin on CORS-relevant requests.
    return null;
  }
  const allowed = allowedOrigins(request);
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return { response: jsonError("Invalid Origin.", 403) };
  }
  if (allowed.has(originHost)) return null;
  return { response: jsonError("Cross-origin request rejected.", 403) };
}

function allowedOrigins(request: Request): Set<string> {
  const hosts = new Set<string>();
  const host = request.headers.get("host");
  if (host !== null) hosts.add(host);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost !== null) hosts.add(forwardedHost);
  const appUrl = process.env.AXON_APP_URL ?? process.env.AUTH_URL;
  if (appUrl !== undefined && appUrl !== "") {
    try {
      hosts.add(new URL(appUrl).host);
    } catch {
      /* ignore malformed config */
    }
  }
  return hosts;
}

/** Reads a JSON body with a byte cap. Returns the parsed value or a failure. */
export async function readJsonBounded(
  request: Request,
  maxBytes: number = PAYLOAD_LIMITS.requestBodyBytes,
): Promise<{ ok: true; value: unknown } | GuardFailure> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) {
    return { response: jsonError("Request body too large.", 413) };
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    return { response: jsonError("Request body too large.", 413) };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { response: jsonError("Request body must be valid JSON.", 400) };
  }
}

/**
 * Guard for a state-changing request that carries no body (e.g. DELETE).
 * Enforces method and same-origin without requiring a JSON body.
 */
export function guardBodylessMutation(
  request: Request,
  methods: readonly string[],
): GuardFailure | null {
  const method = requireMethod(request, methods);
  if (method !== null) return method;
  return requireSameOrigin(request);
}

/**
 * Standard guard for a JSON mutation route: method, content type, same-origin,
 * and a bounded JSON body. Returns the parsed body or a ready-to-return
 * failure Response.
 */
export async function guardMutation(
  request: Request,
  options: { methods: readonly string[]; maxBytes?: number },
): Promise<{ ok: true; body: unknown } | GuardFailure> {
  const method = requireMethod(request, options.methods);
  if (method !== null) return method;
  const origin = requireSameOrigin(request);
  if (origin !== null) return origin;
  const contentType = requireJsonContentType(request);
  if (contentType !== null) return contentType;
  const body = await readJsonBounded(request, options.maxBytes);
  if ("response" in body) return body;
  return { ok: true, body: body.value };
}
