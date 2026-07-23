"use client";

import {
  estimateArchitectureCost,
  estimateArchitectureCostAcrossProviders,
  estimateArchitectureCostAtScale,
  type UsageDriver,
} from "@axon/architecture-cost";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge } from "@axon/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import { defaultUsageFor } from "@/lib/cost/default-usage";

export interface CostWorkspaceProps {
  document: ArchitectureDocument;
}

interface CostHistoryItem {
  id: string;
  provider: string;
  region: string;
  pricingCatalogVersion: string;
  expectedMonthly: number;
  confidence: string;
  createdAt: string;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CostWorkspace({ document }: CostWorkspaceProps) {
  const [history, setHistory] = useState<CostHistoryItem[]>([]);
  const [historyStatus, setHistoryStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [usageDrivers, setUsageDrivers] = useState<UsageDriver[]>(() =>
    defaultUsageFor(document).drivers,
  );
  const [assumptionsStatus, setAssumptionsStatus] = useState<
    "idle" | "loading" | "ready" | "saving" | "saved" | "error"
  >("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const defaultUsageProfile = useMemo(() => defaultUsageFor(document), [document]);
  const usageProfile = useMemo(() => ({ drivers: usageDrivers }), [usageDrivers]);
  const estimate = useMemo(
    () =>
      estimateArchitectureCost({
        document,
        provider: "aws",
        region: "us-east-1",
        usageProfile,
      }),
    [document, usageProfile],
  );
  const scale = useMemo(
    () =>
      estimateArchitectureCostAtScale({
        document,
        provider: "aws",
        region: "us-east-1",
        usageProfile,
      }),
    [document, usageProfile],
  );
  const providerComparison = useMemo(
    () =>
      estimateArchitectureCostAcrossProviders({
        document,
        usageProfile,
      }),
    [document, usageProfile],
  );
  const historyUrl = `/api/projects/${encodeURIComponent(document.projectId)}/cost/estimates`;
  const estimateUrl = `/api/projects/${encodeURIComponent(document.projectId)}/cost/estimate`;
  const assumptionsUrl = `/api/projects/${encodeURIComponent(document.projectId)}/cost/assumptions`;

  useEffect(() => {
    setUsageDrivers(defaultUsageProfile.drivers);
  }, [defaultUsageProfile]);

  const mergeUsageDrivers = useCallback(
    (persisted: readonly UsageDriver[]) => {
      const overrides = new Map(
        persisted.map((driver) => [`${driver.componentId}:${driver.unit}`, driver] as const),
      );
      const merged = defaultUsageProfile.drivers.map(
        (driver) => overrides.get(`${driver.componentId}:${driver.unit}`) ?? driver,
      );
      const defaultKeys = new Set(
        defaultUsageProfile.drivers.map((driver) => `${driver.componentId}:${driver.unit}`),
      );
      for (const driver of persisted) {
        if (!defaultKeys.has(`${driver.componentId}:${driver.unit}`)) {
          merged.push(driver);
        }
      }
      return merged;
    },
    [defaultUsageProfile.drivers],
  );

  const loadAssumptions = useCallback(async () => {
    setAssumptionsStatus("loading");
    try {
      const response = await fetch(assumptionsUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to load cost assumptions");
      const payload = (await response.json()) as { usageDrivers?: UsageDriver[] };
      setUsageDrivers(mergeUsageDrivers(payload.usageDrivers ?? []));
      setAssumptionsStatus("ready");
    } catch {
      setUsageDrivers(defaultUsageProfile.drivers);
      setAssumptionsStatus("error");
    }
  }, [assumptionsUrl, defaultUsageProfile.drivers, mergeUsageDrivers]);

  const loadHistory = useCallback(async () => {
    setHistoryStatus("loading");
    try {
      const response = await fetch(historyUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to load cost history");
      const payload = (await response.json()) as { estimates?: CostHistoryItem[] };
      setHistory(payload.estimates ?? []);
      setHistoryStatus("ready");
    } catch {
      setHistory([]);
      setHistoryStatus("error");
    }
  }, [historyUrl]);

  useEffect(() => {
    void loadAssumptions();
    void loadHistory();
  }, [loadAssumptions, loadHistory]);

  const updateUsageValue = useCallback((driverId: string, value: number) => {
    setUsageDrivers((current) =>
      current.map((driver) =>
        driver.id === driverId
          ? {
              ...driver,
              value,
              source: "user-supplied",
              confidence: "medium",
              userOverride: true,
              derivation: "User-supplied monthly usage assumption from Cost Explorer.",
              observedAt: new Date().toISOString(),
            }
          : driver,
      ),
    );
    setAssumptionsStatus("idle");
  }, []);

  const saveAssumptions = useCallback(async () => {
    setAssumptionsStatus("saving");
    try {
      const response = await fetch(assumptionsUrl, {
        method: "PUT",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ usageDrivers }),
      });
      if (!response.ok) throw new Error("Failed to save cost assumptions");
      setAssumptionsStatus("saved");
    } catch {
      setAssumptionsStatus("error");
    }
  }, [assumptionsUrl, usageDrivers]);

  const saveEstimate = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const response = await fetch(estimateUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          provider: "aws",
          region: "us-east-1",
          usageDrivers: usageProfile.drivers,
          includeScaleProjections: true,
          persistUsageAssumptions: true,
        }),
      });
      if (!response.ok) throw new Error("Failed to save cost estimate");
      setSaveStatus("saved");
      await loadHistory();
    } catch {
      setSaveStatus("error");
    }
  }, [estimateUrl, loadHistory, usageProfile.drivers]);

  const exportEstimate = useCallback(() => {
    downloadTextFile(
      `${document.projectId}-cost-estimate.json`,
      JSON.stringify(
        {
          schemaVersion: "axon.cost-export.v1",
          projectId: document.projectId,
          documentId: document.id,
          exportedAt: new Date().toISOString(),
          provider: "aws",
          region: "us-east-1",
          usageProfile,
          estimate,
          scaleProjections: scale,
          providerComparison,
          limitations: [
            "Modeled estimate from AXON deterministic inputs; not a provider invoice.",
            ...estimate.limitations,
          ],
        },
        null,
        2,
      ),
      "application/json",
    );
  }, [document.id, document.projectId, estimate, providerComparison, scale, usageProfile]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-border-strong bg-surface p-4">
        <div>
          <h2 className="type-headline-md">Cost Explorer</h2>
          <p className="type-body-md mt-2 text-foreground-muted">
            Modeled monthly estimate from explicit assumptions and offline test pricing. This is not
            a provider invoice.
          </p>
        </div>
        <StatusBadge kind={estimate.missingInputs.length > 0 ? "warning" : "info"}>
          {estimate.confidence.toUpperCase()} CONFIDENCE
        </StatusBadge>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void saveEstimate()}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving" ? "Saving" : "Save estimate"}
        </Button>
        <Button variant="secondary" size="sm" onClick={exportEstimate}>
          Export JSON
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Estimated monthly range">
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Low</p>
          <p className="type-headline-md mt-2">{money(estimate.lowMonthly)}</p>
        </div>
        <div className="border-2 border-border-strong bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Expected</p>
          <p className="type-headline-md mt-2">{money(estimate.expectedMonthly)}</p>
        </div>
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">High</p>
          <p className="type-headline-md mt-2">{money(estimate.highMonthly)}</p>
        </div>
      </section>

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Pricing Basis</h3>
        <p className="type-mono-data mt-3 text-foreground">
          AWS · us-east-1 · USD · catalog {estimate.pricingCatalogVersion} · effective{" "}
          {estimate.pricingEffectiveDate}
        </p>
      </section>

      <section className="border-2 border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="type-label-caps text-foreground-muted">Usage Assumptions</h3>
            <p className="type-body-sm mt-2 text-foreground-muted">
              Edit monthly usage inputs before saving an estimate. User-supplied values are stored
              as assumptions, not provider billing data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind={assumptionsStatus === "error" ? "warning" : "info"}>
              {assumptionsStatus === "loading"
                ? "LOADING"
                : assumptionsStatus === "saving"
                  ? "SAVING"
                  : `${usageDrivers.filter((driver) => driver.userOverride).length} OVERRIDES`}
            </StatusBadge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void saveAssumptions()}
              disabled={assumptionsStatus === "saving"}
            >
              {assumptionsStatus === "saving" ? "Saving" : "Save assumptions"}
            </Button>
          </div>
        </div>
        {assumptionsStatus === "saved" ? (
          <p className="type-body-sm mt-3 text-foreground-muted">Usage assumptions saved.</p>
        ) : null}
        {assumptionsStatus === "error" ? (
          <p className="type-body-sm mt-3 text-warning">Usage assumptions unavailable.</p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {usageDrivers.map((driver) => {
            const node = document.nodes.find((item) => item.id === driver.componentId);
            const label = `${node?.name ?? driver.componentId} (${driver.unit})`;
            return (
              <label key={driver.id} className="flex flex-col gap-2 border-2 border-border p-3">
                <span className="type-body-md text-foreground">{label}</span>
                <input
                  aria-label={`Usage value for ${label}`}
                  className="border-2 border-border bg-surface px-3 py-2 type-mono-data text-foreground"
                  min={0}
                  step={1}
                  type="number"
                  value={driver.value}
                  onChange={(event) => {
                    updateUsageValue(driver.id, Number(event.currentTarget.value));
                  }}
                />
                <span className="type-mono-data text-xs text-foreground-muted">
                  {driver.source} · {driver.confidence} · {driver.derivation}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Scale Projection</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {([1, 2, 5, 10, 50] as const).map((factor) => (
            <div key={factor} className="border-2 border-border bg-surface-muted p-3">
              <p className="type-label-caps text-foreground-muted">{factor}x</p>
              <p className="type-mono-data mt-1 text-foreground">
                {money(scale[factor].expectedMonthly)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Cloud Comparison</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {(["aws", "gcp", "azure"] as const).map((provider) => {
            const item = providerComparison[provider];
            return (
              <div key={provider} className="border-2 border-border bg-surface-muted p-3">
                <p className="type-label-caps text-foreground-muted">
                  {provider.toUpperCase()} · {item.region}
                </p>
                <p className="type-mono-data mt-1 text-foreground">{money(item.expectedMonthly)}</p>
                <p className="type-body-sm mt-1 text-foreground-muted">
                  catalog {item.pricingCatalogVersion} · {item.confidence}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Service Breakdown</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {estimate.lineItems.map((item) => (
            <li
              key={item.componentId}
              className="flex flex-wrap items-center justify-between gap-3 border-2 border-border p-3"
            >
              <div>
                <p className="type-body-md text-foreground">{item.componentName}</p>
                <p className="type-mono-data text-foreground-muted">
                  {item.usageValue === null
                    ? "missing usage"
                    : `${item.usageValue} ${item.usageUnit}`}{" "}
                  · {item.confidence}
                </p>
              </div>
              <p className="type-mono-data text-foreground">{money(item.expectedMonthly)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-2 border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="type-label-caps text-foreground-muted">Estimate History</h3>
          <StatusBadge kind={historyStatus === "error" ? "warning" : "info"}>
            {historyStatus === "loading" ? "LOADING" : `${history.length} SAVED`}
          </StatusBadge>
        </div>
        {saveStatus === "saved" ? (
          <p className="type-body-sm mt-3 text-foreground-muted">
            Estimate saved with catalog metadata.
          </p>
        ) : null}
        {saveStatus === "error" ? (
          <p className="type-body-sm mt-3 text-warning">Estimate could not be saved.</p>
        ) : null}
        {historyStatus === "error" ? (
          <p className="type-body-md mt-3 text-foreground-muted">Cost history unavailable.</p>
        ) : history.length === 0 ? (
          <p className="type-body-md mt-3 text-foreground-muted">No saved estimates yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-2 border-border p-3"
              >
                <div>
                  <p className="type-body-md text-foreground">
                    {item.provider.toUpperCase()} · {item.region}
                  </p>
                  <p className="type-mono-data text-foreground-muted">
                    catalog {item.pricingCatalogVersion} · {item.confidence}
                  </p>
                </div>
                <p className="type-mono-data text-foreground">
                  {money(item.expectedMonthly)} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {estimate.missingInputs.length > 0 ? (
        <section className="border-2 border-warning bg-warning-muted p-4">
          <h3 className="type-label-caps text-foreground">Missing Inputs</h3>
          <ul className="type-body-md mt-2 list-disc pl-5 text-foreground">
            {estimate.missingInputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Limitations</h3>
        <ul className="type-body-md mt-2 list-disc pl-5 text-foreground-muted">
          {estimate.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
