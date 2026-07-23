import { describe, expect, it } from "vitest";

import {
  COLLABORATION_PERMISSIONS,
  assertCollaborationPermission,
  hasCollaborationPermission,
} from "./permissions";

describe("collaboration permissions", () => {
  it("grants owners every explicit permission", () => {
    for (const permission of COLLABORATION_PERMISSIONS) {
      expect(hasCollaborationPermission("owner", permission)).toBe(true);
    }
  });

  it("prevents role escalation and destructive actions for non-owners", () => {
    expect(hasCollaborationPermission("editor", "membership:manage")).toBe(false);
    expect(hasCollaborationPermission("editor", "project:delete")).toBe(false);
    expect(hasCollaborationPermission("commenter", "architecture:edit")).toBe(false);
    expect(hasCollaborationPermission("viewer", "evidence:view")).toBe(false);
  });

  it("throws from the server-side assertion helper when denied", () => {
    expect(() => assertCollaborationPermission("viewer", "share:create")).toThrow(
      /viewer cannot share:create/i,
    );
    expect(() => assertCollaborationPermission("editor", "architecture:edit")).not.toThrow();
  });
});
