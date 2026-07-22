import { triggerSessionExpiry } from "./session-expiry-coordinator";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Raised on a 401 so callers can preserve unsaved work before recovery. */
export class SessionExpiredError extends HttpError {
  constructor() {
    super(401, "Your AXON session has expired.");
    this.name = "SessionExpiredError";
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    /* fall through */
  }
  return `Request failed with status ${String(response.status)}.`;
}

/** Same-origin JSON fetch. Sends cookies so the server session authorizes. */
export async function fetchJson<T>(
  input: string,
  init?: RequestInit & { parse?: boolean },
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "same-origin",
  });
  if (response.status === 401) {
    // Session expired mid-use. Do NOT blind-redirect: unsaved work must be
    // preserved first. Trigger the single recovery coordinator and let the
    // caller (e.g. the canvas editor) record recovery state. Never resolve as
    // success, and never show "Saved".
    triggerSessionExpiry();
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    throw new HttpError(response.status, await readError(response));
  }
  if (init?.parse === false || response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
