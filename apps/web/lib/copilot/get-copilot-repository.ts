import { isClientCloudMode } from "@/lib/persistence/client-mode";

import {
  LocalStorageCopilotRepository,
  type CopilotRepository,
} from "./copilot-repository";
import { HttpCopilotRepository } from "./http-copilot-repository";

let repository: CopilotRepository | undefined;

export function getCopilotRepository(): CopilotRepository {
  repository ??= isClientCloudMode()
    ? new HttpCopilotRepository()
    : new LocalStorageCopilotRepository();
  return repository;
}
