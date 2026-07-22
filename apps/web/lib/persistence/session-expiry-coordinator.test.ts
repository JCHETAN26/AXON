import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isSessionExpiryActive,
  onSessionExpiry,
  resetSessionExpiry,
  triggerSessionExpiry,
} from "./session-expiry-coordinator";

afterEach(() => {
  resetSessionExpiry();
});

describe("session-expiry coordinator", () => {
  it("activates and notifies subscribers once", () => {
    const listener = vi.fn();
    onSessionExpiry(listener);
    expect(isSessionExpiryActive()).toBe(false);

    triggerSessionExpiry();
    expect(isSessionExpiryActive()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("collapses concurrent triggers into a single recovery", () => {
    const listener = vi.fn();
    onSessionExpiry(listener);
    triggerSessionExpiry();
    triggerSessionExpiry();
    triggerSessionExpiry();
    // Many failed requests, one recovery experience.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("can be reset after recovery", () => {
    triggerSessionExpiry();
    resetSessionExpiry();
    expect(isSessionExpiryActive()).toBe(false);
    const listener = vi.fn();
    onSessionExpiry(listener);
    triggerSessionExpiry();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes", () => {
    const listener = vi.fn();
    const off = onSessionExpiry(listener);
    off();
    triggerSessionExpiry();
    expect(listener).not.toHaveBeenCalled();
  });
});
