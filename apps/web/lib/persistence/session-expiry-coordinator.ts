/**
 * Coordinates a single session-expiry recovery experience across the app.
 *
 * When any authenticated request returns a structured 401, the coordinator is
 * triggered. Concurrent failures collapse into one active recovery — there is
 * never more than one dialog — and destructive operations are never replayed
 * automatically. The UI subscribes to render exactly one recovery surface.
 */

type Listener = () => void;

let active = false;
const listeners = new Set<Listener>();

export function isSessionExpiryActive(): boolean {
  return active;
}

/**
 * Marks the session as expired and notifies subscribers. Idempotent: repeated
 * calls while a recovery is already active are no-ops, so many failed
 * concurrent requests still produce a single recovery experience.
 */
export function triggerSessionExpiry(): void {
  if (active) return;
  active = true;
  for (const listener of listeners) listener();
}

/** Subscribe to session-expiry activation. Returns an unsubscribe function. */
export function onSessionExpiry(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Resets the coordinator (after successful recovery or explicit discard). */
export function resetSessionExpiry(): void {
  active = false;
}
