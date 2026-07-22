import { isClientCloudMode } from "@/lib/persistence/client-mode";
import { HttpSimulationRepository } from "./http-simulation-repository";
import {
  LocalStorageSimulationRepository,
  type SimulationRepository,
} from "./simulation-repository";

let repository: SimulationRepository | undefined;

export function getSimulationRepository(): SimulationRepository {
  repository ??= isClientCloudMode()
    ? new HttpSimulationRepository()
    : new LocalStorageSimulationRepository();
  return repository;
}
