"use client";

import { type DiffState } from "@axon/architecture-recommendations";
import { createContext, useContext, type ReactNode } from "react";

/**
 * Diff states for the read-only comparison canvas. Like the audit and
 * simulation overlays, this travels through context rather than node data so
 * the renderer stays shared and nothing can dirty a document.
 */
const DiffOverlayContext = createContext<ReadonlyMap<string, DiffState> | null>(null);

export function DiffOverlayProvider({
  nodeStates,
  children,
}: {
  nodeStates: ReadonlyMap<string, DiffState>;
  children: ReactNode;
}) {
  return <DiffOverlayContext.Provider value={nodeStates}>{children}</DiffOverlayContext.Provider>;
}

export function useDiffOverlayState(nodeId: string): DiffState | undefined {
  return useContext(DiffOverlayContext)?.get(nodeId);
}
