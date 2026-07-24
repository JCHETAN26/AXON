"use client";

import { estimateArchitectureCost, type CostLineItem } from "@axon/architecture-cost";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { defaultUsageFor } from "@/lib/cost/default-usage";

export interface CostOverlayEntry {
  readonly expectedMonthly: number;
  readonly confidence: CostLineItem["confidence"];
  readonly pricingCatalogVersion: string;
}

export function deriveCostOverlay(
  document: ArchitectureDocument,
): ReadonlyMap<string, CostOverlayEntry> {
  const estimate = estimateArchitectureCost({
    document,
    provider: "aws",
    region: "us-east-1",
    usageProfile: defaultUsageFor(document),
  });
  return new Map(
    estimate.lineItems
      .filter((item) => item.expectedMonthly > 0)
      .sort((a, b) => b.expectedMonthly - a.expectedMonthly)
      .slice(0, 3)
      .map((item) => [
        item.componentId,
        {
          expectedMonthly: item.expectedMonthly,
          confidence: item.confidence,
          pricingCatalogVersion: estimate.pricingCatalogVersion,
        },
      ]),
  );
}

const CostOverlayContext = createContext<ReadonlyMap<string, CostOverlayEntry>>(new Map());

const EMPTY_COST_OVERLAY: ReadonlyMap<string, CostOverlayEntry> = new Map();

export function CostOverlayProvider({
  document,
  children,
  enabled = true,
}: {
  document: ArchitectureDocument;
  children: ReactNode;
  /** When false, no cost badges are exposed (the canvas overlay is toggled off). */
  enabled?: boolean;
}) {
  const derived = useMemo(() => deriveCostOverlay(document), [document]);
  const value = enabled ? derived : EMPTY_COST_OVERLAY;
  return <CostOverlayContext.Provider value={value}>{children}</CostOverlayContext.Provider>;
}

export function useCostOverlayEntry(nodeId: string): CostOverlayEntry | undefined {
  return useContext(CostOverlayContext).get(nodeId);
}
