"use client";

import { type ComponentResult, type SimulationResult } from "@axon/architecture-simulation";
import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Read-only simulation results reach flow nodes through context — never
 * through React Flow node data — so overlay changes cannot dirty the document
 * or re-trigger the canvas autosave. Same pattern as the audit overlays.
 */
const SimulationOverlayContext = createContext<ReadonlyMap<string, ComponentResult>>(new Map());

export function deriveSimulationOverlay(
  result: SimulationResult | null,
): ReadonlyMap<string, ComponentResult> {
  if (result === null) return new Map();
  return new Map(result.components.map((component) => [component.nodeId, component]));
}

export function SimulationOverlayProvider({
  result,
  children,
}: {
  result: SimulationResult | null;
  children: ReactNode;
}) {
  const value = useMemo(() => deriveSimulationOverlay(result), [result]);
  return (
    <SimulationOverlayContext.Provider value={value}>{children}</SimulationOverlayContext.Provider>
  );
}

export function useSimulationOverlayEntry(nodeId: string): ComponentResult | undefined {
  return useContext(SimulationOverlayContext).get(nodeId);
}
