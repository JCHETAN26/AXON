"use client";

import { useMemo, useState } from "react";

import { ArchitectureServiceIcon } from "@/components/canvas/architecture-service-icon";
import {
  ARCHITECTURE_ICON_REGISTRY,
  searchArchitectureIcons,
  type ArchitectureIconProvider,
  type ArchitectureIconRecord,
} from "@/lib/icons/architecture-icon-registry";

const PROVIDERS: readonly ["all" | ArchitectureIconProvider, ...ArchitectureIconProvider[]] = [
  "all",
  "aws",
  "gcp",
  "azure",
  "kubernetes",
  "cncf",
  "generic",
];

function displayProvider(provider: "all" | ArchitectureIconProvider): string {
  if (provider === "all") return "All";
  if (provider === "aws") return "AWS";
  if (provider === "gcp") return "GCP";
  if (provider === "cncf") return "CNCF";
  return provider[0]?.toUpperCase() + provider.slice(1);
}

function sortIcons(icons: readonly ArchitectureIconRecord[]): ArchitectureIconRecord[] {
  return [...icons].sort((a, b) => {
    const provider = a.provider.localeCompare(b.provider);
    if (provider !== 0) return provider;
    return a.service.localeCompare(b.service);
  });
}

export function IconRegistryWorkspace() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<"all" | ArchitectureIconProvider>("all");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () =>
      Array.from(new Set(ARCHITECTURE_ICON_REGISTRY.map((icon) => icon.logicalCategory))).sort(),
    [],
  );

  const icons = useMemo(() => {
    const base =
      query.trim().length === 0 ? ARCHITECTURE_ICON_REGISTRY : searchArchitectureIcons(query);
    return sortIcons(
      base.filter((icon) => {
        const providerMatches = provider === "all" || icon.provider === provider;
        const categoryMatches = category === "all" || icon.logicalCategory === category;
        return providerMatches && categoryMatches;
      }),
    );
  }, [category, provider, query]);

  return (
    <section className="flex flex-col gap-6" aria-labelledby="icon-registry-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-4">
        <div>
          <p className="type-label-caps text-foreground-muted">Visual Architecture Studio</p>
          <h2 id="icon-registry-heading" className="type-headline-md mt-2">
            Icon Registry
          </h2>
        </div>
        <p className="type-mono-data text-foreground-muted">
          {icons.length} of {ARCHITECTURE_ICON_REGISTRY.length} records
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto_auto]">
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Search</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="database, sqs, kubernetes..."
            className="type-body-md min-h-11 border-2 border-border bg-surface px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Provider</span>
          <select
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value as "all" | ArchitectureIconProvider);
            }}
            className="type-body-md min-h-11 border-2 border-border bg-surface px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          >
            {PROVIDERS.map((providerOption) => (
              <option key={providerOption} value={providerOption}>
                {displayProvider(providerOption)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Category</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
            }}
            className="type-body-md min-h-11 border-2 border-border bg-surface px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          >
            <option value="all">All</option>
            {categories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {icons.map((icon) => (
          <article key={icon.id} className="border-2 border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center border-2 border-border-strong">
                <ArchitectureServiceIcon icon={icon} className="text-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="type-body-md font-semibold">{icon.service}</h3>
                <p className="type-mono-data mt-1 text-foreground-muted">{icon.id}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <dt className="type-label-caps text-foreground-muted">Provider</dt>
                <dd className="type-body-md mt-1">{displayProvider(icon.provider)}</dd>
              </div>
              <div>
                <dt className="type-label-caps text-foreground-muted">Category</dt>
                <dd className="type-body-md mt-1">{icon.logicalCategory}</dd>
              </div>
              <div className="col-span-2">
                <dt className="type-label-caps text-foreground-muted">Aliases</dt>
                <dd className="type-mono-data mt-1 text-foreground-muted">
                  {icon.aliases.join(", ")}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="type-label-caps text-foreground-muted">Source</dt>
                <dd className="type-mono-data mt-1 text-foreground-muted">
                  {icon.source} · {icon.version}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {icons.length === 0 ? (
        <p className="type-body-md border-2 border-dashed border-border p-4 text-foreground-muted">
          No icon records match the current filters.
        </p>
      ) : null}

      <p className="type-mono-data border-t-2 border-border pt-4 text-foreground-muted">
        Current records use AXON-authored generic SVG glyphs. They are not official provider logos
        or redistributed provider assets.
      </p>
    </section>
  );
}
