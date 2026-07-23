"use client";

import { estimateArchitectureCostAcrossProviders } from "@axon/architecture-cost";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import {
  MULTICLOUD_CATALOG_VERSION,
  listCloudCapabilities,
  planMultiCloudMigration,
  type MultiCloudProvider,
} from "@axon/repo-intel";
import { StatusBadge } from "@axon/ui";
import { useEffect, useMemo, useState } from "react";

import { defaultUsageFor } from "@/lib/cost/default-usage";
import { getMultiCloudRepository } from "@/lib/multicloud/get-multicloud-repository";
import {
  MULTICLOUD_STATE_SCHEMA_VERSION,
  type MultiCloudState,
} from "@/lib/multicloud/multicloud-state";

type WorkspaceCloudProvider = Exclude<MultiCloudProvider, "neutral">;

const CLOUD_PROVIDERS = ["aws", "gcp", "azure"] as const satisfies readonly WorkspaceCloudProvider[];

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function MultiCloudWorkspace({ document }: { document: ArchitectureDocument }) {
  const [sourceProvider, setSourceProvider] = useState<WorkspaceCloudProvider>("aws");
  const [targetProvider, setTargetProvider] = useState<WorkspaceCloudProvider>("gcp");
  const [targetOverrides, setTargetOverrides] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">(
    "loading",
  );
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
  const targetCapabilities = useMemo(() => listCloudCapabilities(targetProvider), [targetProvider]);

  useEffect(() => {
    let cancelled = false;
    setSaveStatus("loading");
    void getMultiCloudRepository()
      .getMultiCloudState(document.projectId)
      .then((stored) => {
        if (cancelled) return;
        if (stored !== null && stored.documentId === document.id) {
          setSourceProvider(stored.sourceProvider);
          setTargetProvider(stored.targetProvider);
          setTargetOverrides(stored.targetOverrides);
        } else {
          setTargetOverrides({});
        }
        setSaveStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setSaveStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [document.id, document.projectId]);

  const persist = async (next: {
    readonly sourceProvider: WorkspaceCloudProvider;
    readonly targetProvider: WorkspaceCloudProvider;
    readonly targetOverrides: Record<string, string>;
  }) => {
    setSaveStatus("saving");
    const state: MultiCloudState = {
      schemaVersion: MULTICLOUD_STATE_SCHEMA_VERSION,
      projectId: document.projectId,
      documentId: document.id,
      sourceProvider: next.sourceProvider,
      targetProvider: next.targetProvider,
      targetOverrides: next.targetOverrides,
      updatedAt: new Date().toISOString(),
    };
    try {
      await getMultiCloudRepository().saveMultiCloudState(state);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const updateSourceProvider = (provider: WorkspaceCloudProvider) => {
    setSourceProvider(provider);
    void persist({ sourceProvider: provider, targetProvider, targetOverrides });
  };

  const updateTargetProvider = (provider: WorkspaceCloudProvider) => {
    setTargetProvider(provider);
    const nextOverrides: Record<string, string> = {};
    setTargetOverrides(nextOverrides);
    void persist({ sourceProvider, targetProvider: provider, targetOverrides: nextOverrides });
  };

  const updateTargetOverride = (componentId: string, serviceId: string) => {
    const nextOverrides =
      serviceId.length === 0
        ? Object.fromEntries(
            Object.entries(targetOverrides).filter(([key]) => key !== componentId),
          )
        : { ...targetOverrides, [componentId]: serviceId };
    setTargetOverrides(nextOverrides);
    void persist({ sourceProvider, targetProvider, targetOverrides: nextOverrides });
  };

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
        <StatusBadge kind={saveStatus === "error" ? "warning" : "info"}>
          {saveStatus === "saving"
            ? "SAVING"
            : saveStatus === "loading"
              ? "LOADING"
              : `${Object.keys(targetOverrides).length} OVERRIDES`}
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
            onChange={(event) => updateSourceProvider(event.target.value as WorkspaceCloudProvider)}
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
            onChange={(event) => updateTargetProvider(event.target.value as WorkspaceCloudProvider)}
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
          {plan.mappings.map((mapping) => {
            const override = targetOverrides[mapping.sourceComponentId];
            const selectedTarget =
              targetCapabilities.find((candidate) => candidate.serviceId === override) ??
              mapping.selectedTarget;
            return (
              <li key={mapping.sourceComponentId} className="border-2 border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="type-body-md text-foreground">{mapping.sourceName}</p>
                    <p className="type-mono-data text-foreground-muted">
                      {mapping.sourceCapability?.displayName ?? "Uncataloged source"} →{" "}
                      {selectedTarget?.displayName ?? "Target decision required"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {override !== undefined ? (
                      <StatusBadge kind="info">user-selected</StatusBadge>
                    ) : null}
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
                </div>
                {mapping.targetCandidates.length > 1 || mapping.confidence !== "high" ? (
                  <label className="mt-3 flex flex-col gap-2">
                    <span className="type-label-caps text-foreground-muted">Target selection</span>
                    <select
                      aria-label={`Target selection for ${mapping.sourceName}`}
                      value={override ?? mapping.selectedTarget?.serviceId ?? ""}
                      onChange={(event) =>
                        updateTargetOverride(mapping.sourceComponentId, event.currentTarget.value)
                      }
                      className="type-body-sm border-2 border-border bg-surface px-3 py-2 text-foreground"
                    >
                      <option value="">Use AXON catalog default</option>
                      {mapping.targetCandidates.map((candidate) => (
                        <option key={candidate.serviceId} value={candidate.serviceId}>
                          {candidate.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {mapping.unresolvedDecisions.length > 0 ? (
                  <ul className="type-body-sm mt-2 list-disc pl-5 text-foreground-muted">
                    {mapping.unresolvedDecisions.map((decision) => (
                      <li key={decision}>{decision}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
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
