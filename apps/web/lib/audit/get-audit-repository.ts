import { isClientCloudMode } from "@/lib/persistence/client-mode";
import { LocalStorageAuditRepository, type AuditRepository } from "./audit-repository";
import { HttpAuditRepository } from "./http-audit-repository";

let repository: AuditRepository | undefined;

export function getAuditRepository(): AuditRepository {
  repository ??= isClientCloudMode()
    ? new HttpAuditRepository()
    : new LocalStorageAuditRepository();
  return repository;
}
