"use client";

import {
  ComposeImportError,
  IMPORT_DISCLAIMER,
  IMPORT_LIMITS,
  IMPORTER_VERSION,
  importCompose,
  type ComposeImportResult,
  type ImportWarning,
} from "@axon/architecture-compose-import";
import { computeDocumentDiff, type DocumentDiff } from "@axon/architecture-recommendations";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge, cx } from "@axon/ui";
import { useMemo, useRef, useState } from "react";

import { DiffOverlayProvider } from "@/components/canvas/diff-overlay-context";
import { ReadOnlyArchitectureCanvas } from "@/components/canvas/read-only-architecture-canvas";
import { buildImportedDocument } from "@/lib/import/candidate-to-document";
import { getImportRepository } from "@/lib/import/get-import-repository";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { type ProjectWithDocument } from "@/lib/projects/repository";

const CATEGORY_OPTIONS = [
  "Service",
  "Gateway",
  "Database",
  "Cache",
  "Broker",
  "Storage",
  "Observability",
  "Compute",
  "External",
] as const;

const CONFIDENCE_KIND = { high: "success", medium: "warning", low: "critical" } as const;
const WARNING_KIND = { unsupported: "critical", review: "warning", info: "neutral" } as const;

type PreviewMode = "current" | "imported" | "diff";

export interface ImportWorkspaceProps {
  projectId: string;
  document: ArchitectureDocument;
  initialText: string;
  initialOverrides: Readonly<Record<string, string>>;
  onImported: (saved: ProjectWithDocument) => void;
}

/**
 * Docker Compose import surface: paste or upload a Compose document, review
 * the detected services and warnings, correct uncertain classifications,
 * preview Current / Imported / Diff, and approve. Nothing is executed and the
 * project document changes only on explicit approval.
 */
export function ImportWorkspace({
  projectId,
  document,
  initialText,
  initialOverrides,
  onImported,
}: ImportWorkspaceProps) {
  const [text, setText] = useState(initialText);
  const [overrides, setOverrides] = useState<Record<string, string>>({ ...initialOverrides });
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposeImportResult | null>(null);
  const [view, setView] = useState<PreviewMode>("imported");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persistDraft = (nextText: string, nextOverrides: Record<string, string>) => {
    void getImportRepository().saveDraft({
      schemaVersion: "1.0",
      projectId,
      composeText: nextText,
      categoryOverrides: nextOverrides,
      updatedAt: new Date().toISOString(),
    });
  };

  const runImport = (sourceText: string, nextOverrides: Record<string, string>) => {
    try {
      const imported = importCompose(sourceText, { categoryOverrides: nextOverrides });
      setResult(imported);
      setParseError(null);
    } catch (error) {
      setResult(null);
      setParseError(
        error instanceof ComposeImportError ? error.message : "The document could not be parsed.",
      );
    }
  };

  const onParse = () => {
    setApplyError(null);
    runImport(text, overrides);
    persistDraft(text, overrides);
  };

  const onFile = async (file: File) => {
    if (file.size > IMPORT_LIMITS.maxBytes) {
      setParseError(`File exceeds the ${String(IMPORT_LIMITS.maxBytes)}-byte limit.`);
      return;
    }
    // Read as text only — the file is never executed, and its path is not used.
    const content = await file.text();
    setText(content);
    setApplyError(null);
    runImport(content, overrides);
    persistDraft(content, overrides);
  };

  const onOverride = (serviceName: string, category: string, detected: string) => {
    // Selecting the detected category clears the override rather than pinning
    // an equal value.
    const next = Object.fromEntries(
      Object.entries(overrides).filter(([name]) => name !== serviceName),
    );
    if (category !== detected) {
      next[serviceName] = category;
    }
    setOverrides(next);
    runImport(text, next);
    persistDraft(text, next);
  };

  // The categories AXON detected *before* any reviewer override — the baseline
  // a "reset to detected" compares against. Recomputed deterministically.
  const detectedCategories = useMemo(() => {
    if (result === null) return new Map<string, string>();
    try {
      const base = importCompose(text, {});
      return new Map(base.candidate.nodes.map((node) => [node.name, node.category]));
    } catch {
      return new Map<string, string>();
    }
  }, [result, text]);

  // The imported preview document is built through the same validated path as
  // approval, so what the user previews is exactly what would be persisted.
  const preview = useMemo(() => {
    if (result === null) return null;
    const built = buildImportedDocument({
      candidate: result.candidate,
      base: document,
      importerVersion: result.importerVersion,
      options: { categoryOverrides: overrides },
      now: document.updatedAt,
    });
    return built.ok ? built.document : null;
  }, [result, document, overrides]);

  const diff: DocumentDiff | null = useMemo(
    () => (preview === null ? null : computeDocumentDiff(document, preview)),
    [document, preview],
  );

  const approve = async () => {
    if (result === null) return;
    setBusy(true);
    const built = buildImportedDocument({
      candidate: result.candidate,
      base: document,
      importerVersion: result.importerVersion,
      options: { categoryOverrides: overrides },
      now: new Date().toISOString(),
    });
    if (!built.ok) {
      setBusy(false);
      setApplyError(`The imported architecture is not valid: ${built.reasons.join("; ")}`);
      return;
    }
    try {
      const saved = await getProjectRepository().updateDocument(projectId, built.document);
      await getImportRepository().deleteDraft(projectId);
      setBusy(false);
      setApplyError(null);
      onImported(saved);
    } catch (error) {
      setBusy(false);
      setApplyError(error instanceof Error ? error.message : "Could not save the import.");
    }
  };

  const detectedCategory = (serviceName: string): string => {
    const node = result?.candidate.nodes.find((candidate) => candidate.name === serviceName);
    return overrides[serviceName] ?? node?.category ?? "Service";
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="type-body-md border-2 border-border-strong bg-surface-muted p-3">
        {IMPORT_DISCLAIMER}
      </p>

      <section aria-label="Compose source" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="compose-input" className="type-label-caps text-foreground-muted">
            Docker Compose document
          </label>
          <input
            ref={fileInputRef}
            id="compose-file"
            type="file"
            accept=".yaml,.yml,text/yaml,application/yaml"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) void onFile(file);
              event.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            Upload .yaml / .yml
          </Button>
        </div>
        <textarea
          id="compose-input"
          value={text}
          spellCheck={false}
          rows={10}
          placeholder="Paste a compose.yaml / docker-compose.yml document here"
          onChange={(event) => {
            setText(event.target.value);
          }}
          className={cx(
            "type-mono-data w-full rounded-module border-2 border-border bg-surface p-3",
            "focus-visible:border-accent focus-visible:outline-none",
          )}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm" onClick={onParse} disabled={text.trim() === ""}>
            Parse Compose
          </Button>
          <p
            role="status"
            aria-live="polite"
            aria-label="Import status"
            className={cx(
              "type-mono-data",
              parseError !== null ? "text-critical" : "text-foreground-muted",
            )}
          >
            {parseError !== null
              ? `PARSE_FAILED · ${parseError}`
              : result === null
                ? `NOT_PARSED · importer v${IMPORTER_VERSION}`
                : `DETECTED · ${String(result.candidate.nodes.length)} services · ${String(result.warnings.length)} warnings`}
          </p>
        </div>
      </section>

      {result !== null && (
        <>
          <ReviewTable
            result={result}
            effectiveCategory={detectedCategory}
            detectedCategories={detectedCategories}
            onOverride={onOverride}
          />
          <WarningList warnings={result.warnings} />

          {preview !== null && diff !== null && (
            <section aria-label="Import preview" className="flex flex-col gap-3">
              <div role="tablist" aria-label="Preview view" className="flex flex-wrap gap-2">
                {(["current", "imported", "diff"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={view === mode}
                    onClick={() => {
                      setView(mode);
                    }}
                    className={cx(
                      "type-label-caps border-2 px-3 py-1.5 capitalize focus-visible:outline-2 focus-visible:outline-accent",
                      view === mode
                        ? "border-accent bg-accent-muted text-foreground"
                        : "border-border text-foreground-muted hover:border-border-strong",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="type-mono-data text-foreground-muted">
                {diff.addedCount} added · {diff.modifiedCount} modified · {diff.removedCount}{" "}
                removed
              </p>
              {view === "current" && (
                <ReadOnlyArchitectureCanvas document={document} label="Current architecture" />
              )}
              {view === "imported" && (
                <ReadOnlyArchitectureCanvas document={preview} label="Imported architecture" />
              )}
              {view === "diff" && (
                <DiffOverlayProvider nodeStates={diff.nodeStates}>
                  <ReadOnlyArchitectureCanvas document={preview} label="Import diff" />
                </DiffOverlayProvider>
              )}
            </section>
          )}

          <section
            aria-label="Approve import"
            className="flex flex-col gap-3 border-t-2 border-border pt-5"
          >
            {document.nodes.length > 0 && (
              <p className="type-body-md text-warning">
                This project already has an architecture. Approving replaces it with the imported
                one. This can be undone by editing the canvas; the import is not applied until you
                approve.
              </p>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                void approve();
              }}
              disabled={busy || preview === null}
              className="self-start"
            >
              {busy ? "Importing…" : "Approve and Import"}
            </Button>
            {applyError !== null && <p className="type-mono-data text-critical">{applyError}</p>}
            <p className="type-mono-data text-foreground-muted">
              Based on the supplied Compose document · requires production validation.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function ReviewTable({
  result,
  effectiveCategory,
  detectedCategories,
  onOverride,
}: {
  result: ComposeImportResult;
  effectiveCategory: (name: string) => string;
  detectedCategories: ReadonlyMap<string, string>;
  onOverride: (name: string, category: string, detected: string) => void;
}) {
  return (
    <section aria-label="Detected services">
      <h3 className="type-label-caps text-foreground-muted">
        Detected services ({result.candidate.nodes.length})
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left">
              <th className="type-label-caps p-2 text-foreground-muted">Service</th>
              <th className="type-label-caps p-2 text-foreground-muted">Confidence</th>
              <th className="type-label-caps p-2 text-foreground-muted">Category</th>
            </tr>
          </thead>
          <tbody>
            {result.candidate.nodes.map((node) => {
              const detected = detectedCategories.get(node.name) ?? node.category;
              return (
                <tr key={node.id} className="border-t-2 border-border align-top">
                  <td className="p-2">
                    <p className="type-body-md font-semibold">{node.name}</p>
                    <p className="type-mono-data text-foreground-muted">{node.rationale}</p>
                  </td>
                  <td className="p-2">
                    <StatusBadge kind={CONFIDENCE_KIND[node.classification]}>
                      {node.classification}
                    </StatusBadge>
                  </td>
                  <td className="p-2">
                    <label htmlFor={`category-${node.id}`} className="sr-only">
                      Category for {node.name}
                    </label>
                    <select
                      id={`category-${node.id}`}
                      value={effectiveCategory(node.name)}
                      onChange={(event) => {
                        onOverride(node.name, event.target.value, detected);
                      }}
                      className="type-mono-data rounded-control border-2 border-border bg-surface px-2 py-1"
                    >
                      {[...new Set([detected, ...CATEGORY_OPTIONS])].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WarningList({ warnings }: { warnings: readonly ImportWarning[] }) {
  if (warnings.length === 0) {
    return (
      <p className="type-mono-data text-foreground-muted">
        No unresolved Compose features detected.
      </p>
    );
  }
  return (
    <section aria-label="Import warnings">
      <h3 className="type-label-caps text-foreground-muted">
        Unresolved and unsupported features ({warnings.length})
      </h3>
      <ul className="mt-3 flex flex-col gap-2">
        {warnings.map((warning) => (
          <li
            key={`${warning.code}:${warning.target}`}
            className="flex flex-col gap-1 rounded-module border-2 border-border bg-surface p-3"
          >
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge kind={WARNING_KIND[warning.severity]}>{warning.severity}</StatusBadge>
              <span className="type-mono-data text-foreground-muted">{warning.target}</span>
            </span>
            <span className="type-body-md">{warning.message}</span>
            <span className="type-body-md text-foreground-muted">{warning.effect}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
