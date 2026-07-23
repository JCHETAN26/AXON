"use client";

import { estimateArchitectureCostAcrossProviders } from "@axon/architecture-cost";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import {
  MULTICLOUD_CATALOG_VERSION,
  planMultiCloudMigration,
  type MultiCloudProvider,
} from "@axon/repo-intel";
import { StatusBadge } from "@axon/ui";
import { useMemo, useState } from "react";

import { defaultUsageFor } from "@/lib/cost/default-usage";

const CLOUD_PROVIDERS = ["aws", "gcp", "azure"] as const;

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function MultiCloudWorkspace({ document }: { document: ArchitectureDocument }) {
  const [sourceProvider, setSourceProvider] = useState<MultiCloudProvider>("aws");
  const [targetProvider, setTargetProvider] = useState<MultiCloudProvider>("gcp");
  const plan = useMemo(
    () =>
      planMultiCloudMigration({
        document,
        sourceProvider,
        targetProvider,
      }),
    [document, sourceProvider, targetProvider],
  );
  const costs = useMemo(
    () =>
      estimateArchitectureCostAcrossProviders({
        document,
        usageProfile: defaultUsageFor(document),
      }),
    [document],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-border-strong bg-surface p-4">
        <div>
          <h2 className="type-headline-md">Multi-Cloud Workspace</h2>
          <p className="type-body-md mt-2 text-foreground-muted">
            Deterministic provider comparison from AXON's curated capability catalog. No live cloud
            inventory is queried, and no migration is recommended automatically.
          </p>
        </div>
        <StatusBadge
          kind={
            plan.confidence === "high"
              ? "success"
              : plan.confidence === "medium"
                ? "warning"
                : "critical"
          }
        >
          {plan.confidence.toUpperCase()} CONFIDENCE
        </StatusBadge>
      </div>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Provider cost comparison">
        {CLOUD_PROVIDERS.map((provider) => (
          <div key={provider} className="border-2 border-border bg-surface p-4">
            <p className="type-label-caps text-foreground-muted">
              {provider.toUpperCase()} · {costs[provider].region}
            </p>
            <p className="type-headline-md mt-2">{money(costs[provider].expectedMonthly)}</p>
            <p className="type-body-sm mt-2 text-foreground-muted">
              catalog {costs[provider].pricingCatalogVersion}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2" aria-label="Provider selection">
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Source Provider</span>
          <select
            value={sourceProvider}
            onChange={(event) => setSourceProvider(event.target.value as MultiCloudProvider)}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          >
            {CLOUD_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Target Provider</span>
          <select
            value={targetProvider}
            onChange={(event) => setTargetProvider(event.target.value as MultiCloudProvider)}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          >
            {CLOUD_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="border-2 border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="type-label-caps text-foreground-muted">Mapping Table</h3>
          <span className="type-mono-data text-foreground-muted">
            catalog {MULTICLOUD_CATALOG_VERSION}
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {plan.mappings.map((mapping) => (
            <li key={mapping.sourceComponentId} className="border-2 border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-body-md text-foreground">{mapping.sourceName}</p>
                  <p className="type-mono-data text-foreground-muted">
                    {mapping.sourceCapability?.displayName ?? "Uncataloged source"} →{" "}
                    {mapping.selectedTarget?.displayName ?? "Target decision required"}
                  </p>
                </div>
                <StatusBadge
                  kind={
                    mapping.confidence === "high"
                      ? "success"
                      : mapping.confidence === "medium"
                        ? "warning"
                        : "critical"
                  }
                >
                  {mapping.mappingType}
                </StatusBadge>
              </div>
              {mapping.unresolvedDecisions.length > 0 ? (
                <ul className="type-body-sm mt-2 list-disc pl-5 text-foreground-muted">
                  {mapping.unresolvedDecisions.map((decision) => (
                    <li key={decision}>{decision}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {plan.warnings.length > 0 ? (
        <section className="border-2 border-warning bg-warning-muted p-4">
          <h3 className="type-label-caps text-foreground">Warnings</h3>
          <ul className="type-body-md mt-2 list-disc pl-5 text-foreground">
            {plan.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
