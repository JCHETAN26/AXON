export const COLLABORATION_ROLES = ["owner", "editor", "commenter", "viewer"] as const;
export type CollaborationRole = (typeof COLLABORATION_ROLES)[number];

export const COLLABORATION_PERMISSIONS = [
  "architecture:edit",
  "evidence:view",
  "repository:connect",
  "cloud:connect",
  "telemetry:connect",
  "scenario:create",
  "cost:view",
  "migration:plan",
  "infrastructure:approve",
  "membership:manage",
  "share:create",
  "export:create",
  "project:delete",
] as const;
export type CollaborationPermission = (typeof COLLABORATION_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<CollaborationRole, ReadonlySet<CollaborationPermission>> = {
  owner: new Set(COLLABORATION_PERMISSIONS),
  editor: new Set([
    "architecture:edit",
    "evidence:view",
    "repository:connect",
    "cloud:connect",
    "telemetry:connect",
    "scenario:create",
    "cost:view",
    "migration:plan",
    "infrastructure:approve",
    "share:create",
    "export:create",
  ]),
  commenter: new Set(["evidence:view", "cost:view", "migration:plan", "export:create"]),
  viewer: new Set(["cost:view", "export:create"]),
};

export function hasCollaborationPermission(
  role: CollaborationRole,
  permission: CollaborationPermission,
): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function assertCollaborationPermission(
  role: CollaborationRole,
  permission: CollaborationPermission,
): void {
  if (!hasCollaborationPermission(role, permission)) {
    throw new Error(`Role ${role} cannot ${permission}.`);
  }
}
