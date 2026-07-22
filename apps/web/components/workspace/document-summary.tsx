import { type ArchitectureDocument } from "@axon/diagram-schema";
import { cx } from "@axon/ui";

/**
 * Read-only summary of a persisted architecture document. Renders only from
 * the document — never from the landing demo dataset.
 */
export function DocumentSummary({ document }: { document: ArchitectureDocument }) {
  if (document.nodes.length === 0) {
    return (
      <div className="bg-canvas-grid border border-border p-10 text-center">
        <p className="type-headline-md">Blank architecture.</p>
        <p className="type-body-md mx-auto mt-3 max-w-md text-foreground-muted">
          Generation and canvas editing arrive in upcoming beta slices. This document is saved and
          ready.
        </p>
      </div>
    );
  }

  const ungrouped = document.nodes.filter((node) => node.groupId === undefined);

  return (
    <div className="flex flex-col gap-6">
      <p className="type-mono-data text-foreground-muted">
        {document.nodes.length} services · {document.edges.length} connections ·{" "}
        {document.groups.length} groups · {document.assumptions.length} assumptions
      </p>
      <div className="bg-canvas-grid grid grid-cols-1 gap-3 border border-border p-4 sm:grid-cols-2 xl:grid-cols-4">
        {document.groups.map((group) => (
          <section
            key={group.id}
            aria-label={group.label}
            className="border border-dashed border-border-strong p-2"
          >
            <p className="type-label-caps mb-2 text-foreground-muted">{group.label}</p>
            <ul className="flex flex-col gap-2">
              {document.nodes
                .filter((node) => node.groupId === group.id)
                .map((node) => (
                  <li
                    key={node.id}
                    className={cx(
                      "border bg-surface px-2 py-1.5",
                      node.planned === true
                        ? "border-dashed border-border-strong"
                        : "border-border-strong",
                    )}
                  >
                    <span className="type-mono-data block text-foreground">{node.name}</span>
                    <span className="type-label-caps text-foreground-muted">{node.category}</span>
                    {node.meta !== undefined && (
                      <span className="type-mono-data block text-foreground-muted">
                        {node.meta}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {ungrouped.length > 0 && (
          <section aria-label="Ungrouped" className="border border-dashed border-border p-2">
            <p className="type-label-caps mb-2 text-foreground-muted">Ungrouped</p>
            <ul className="flex flex-col gap-2">
              {ungrouped.map((node) => (
                <li key={node.id} className="border border-border-strong bg-surface px-2 py-1.5">
                  <span className="type-mono-data block text-foreground">{node.name}</span>
                  <span className="type-label-caps text-foreground-muted">{node.category}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {document.assumptions.length > 0 && (
        <div>
          <p className="type-label-caps text-foreground-muted">Assumptions</p>
          <dl className="mt-2 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
            {document.assumptions.map((assumption) => (
              <div key={assumption.id} className="bg-surface p-3">
                <dt className="type-label-caps text-foreground-muted">{assumption.label}</dt>
                <dd className="type-mono-data mt-1 text-foreground">{assumption.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
