"use client";

import { type ProjectAuditState } from "@axon/architecture-audit";
import {
  runSimulation,
  type ProjectSimulationState,
  type SimulationResult,
} from "@axon/architecture-simulation";
import { type ProjectRecommendationState } from "@axon/architecture-recommendations";
import { buttonClasses, cx } from "@axon/ui";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuditWorkspace } from "./audit-workspace";
import { DocumentSummary } from "./document-summary";
import { GenerationPanel } from "./generation-panel";
import { ImportWorkspace } from "./import-workspace";
import { RecommendationWorkspace } from "./recommendation-workspace";
import { SimulationWorkspace } from "./simulation-workspace";
import { ArchitectureCanvasEditor } from "@/components/canvas/architecture-canvas-editor";
import { AuditOverlayProvider } from "@/components/canvas/audit-overlay-context";
import { SimulationOverlayProvider } from "@/components/canvas/simulation-overlay-context";
import { getAuditRepository } from "@/lib/audit/get-audit-repository";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { type ProjectWithDocument } from "@/lib/projects/repository";
import { getImportRepository } from "@/lib/import/get-import-repository";
import { type ImportDraft } from "@/lib/import/import-repository";
import { getRecommendationRepository } from "@/lib/recommendations/get-recommendation-repository";
import { getSimulationRepository } from "@/lib/simulation/get-simulation-repository";

const PLANNED_TOOLS = ["Monitor"] as const;

type WorkspaceTool = "canvas" | "audit" | "simulate" | "recommend" | "import";

const TOOL_LABEL: Record<WorkspaceTool, string> = {
  canvas: "Canvas",
  audit: "Audit",
  simulate: "Simulate",
  recommend: "Recommend",
  import: "Import",
};
const TOOLS: readonly WorkspaceTool[] = ["canvas", "audit", "simulate", "recommend", "import"];

type ShellState =
  { status: "loading" } | { status: "not-found" } | { status: "ready"; data: ProjectWithDocument };

export function WorkspaceShell({ projectId }: { projectId: string }) {
  const [state, setState] = useState<ShellState>({ status: "loading" });
  const [activeTool, setActiveTool] = useState<WorkspaceTool>("canvas");
  const [auditState, setAuditState] = useState<ProjectAuditState | null>(null);
  const [simulationState, setSimulationState] = useState<ProjectSimulationState | null>(null);
  const [recommendationState, setRecommendationState] = useState<ProjectRecommendationState | null>(
    null,
  );
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  // Bumped only when the document is replaced from outside the canvas editor
  // (applying a recommendation). The editor owns its canvas state once
  // mounted, so it must be remounted to pick the new document up — otherwise
  // its next autosave would write stale in-memory state over the change.
  const [externalRevision, setExternalRevision] = useState(0);
  const tabRefs = useRef<Partial<Record<WorkspaceTool, HTMLButtonElement | null>>>({});

  useEffect(() => {
    let cancelled = false;
    void getProjectRepository()
      .getProject(projectId)
      .then((data) => {
        if (!cancelled) {
          setState(data === null ? { status: "not-found" } : { status: "ready", data });
        }
      });
    void getAuditRepository()
      .getAuditState(projectId)
      .then((persisted) => {
        if (!cancelled) {
          setAuditState(persisted);
        }
      });
    void getSimulationRepository()
      .getSimulationState(projectId)
      .then((persisted) => {
        if (!cancelled) {
          setSimulationState(persisted);
        }
      });
    void getRecommendationRepository()
      .getRecommendationState(projectId)
      .then((persisted) => {
        if (!cancelled) {
          setRecommendationState(persisted);
        }
      });
    void getImportRepository()
      .getDraft(projectId)
      .then((draft) => {
        if (!cancelled) {
          setImportDraft(draft);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Canvas overlays reuse the persisted simulation inputs, recomputed against
  // the document on screen so the overlay can never describe a stale graph.
  const canvasSimulation = useMemo<SimulationResult | null>(() => {
    if (state.status !== "ready" || simulationState === null) return null;
    return runSimulation({
      document: state.data.document,
      scenario: simulationState.scenario,
      capacityProfile: simulationState.capacityProfile,
    });
  }, [state, simulationState]);

  if (state.status === "loading") {
    return <p className="type-mono-data text-foreground-muted">LOADING_PROJECT…</p>;
  }

  if (state.status === "not-found") {
    return (
      <div className="border-2 border-dashed border-border-strong p-10 text-center">
        <p className="type-headline-md">Project not found.</p>
        <p className="type-body-md mt-3 text-foreground-muted">
          It may have been deleted, or it belongs to a different browser profile.
        </p>
        <Link href="/projects" className={buttonClasses("secondary", "md", "mt-6")}>
          Back to Projects
        </Link>
      </div>
    );
  }

  const { project, document } = state.data;

  const focusTool = (tool: WorkspaceTool) => {
    setActiveTool(tool);
    tabRefs.current[tool]?.focus();
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-label-caps text-foreground-muted">
            {document.source.label ?? `Source: ${document.source.kind}`}
          </p>
          <h1 className="type-headline-lg mt-2">{project.name}</h1>
          <p className="type-mono-data mt-2 text-foreground-muted">
            created {new Date(project.createdAt).toLocaleDateString("en-US")} · schema v
            {document.schemaVersion}
          </p>
        </div>
        <p className="type-mono-data text-foreground-muted">
          WORKSPACE_BETA · edits autosave locally
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Workspace tools" className="flex items-center gap-2">
          {TOOLS.map((tool) => (
            <button
              key={tool}
              ref={(element) => {
                tabRefs.current[tool] = element;
              }}
              type="button"
              role="tab"
              id={`workspace-tab-${tool}`}
              aria-selected={activeTool === tool}
              aria-controls={`workspace-panel-${tool}`}
              tabIndex={activeTool === tool ? 0 : -1}
              onClick={() => {
                setActiveTool(tool);
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const step = event.key === "ArrowRight" ? 1 : -1;
                const next = TOOLS[(TOOLS.indexOf(tool) + step + TOOLS.length) % TOOLS.length];
                if (next !== undefined) focusTool(next);
              }}
              className={cx(
                "type-label-caps border-2 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-accent",
                activeTool === tool
                  ? "border-accent bg-accent-muted text-foreground"
                  : "border-border text-foreground-muted hover:border-border-strong",
              )}
            >
              {TOOL_LABEL[tool]}
            </button>
          ))}
        </div>
        {PLANNED_TOOLS.map((tool) => (
          <span
            key={tool}
            className={cx(
              "type-label-caps flex items-center gap-2 border-2 border-dashed border-border px-3 py-1.5",
              "text-foreground-muted",
            )}
          >
            {tool}
            <span className="border border-border px-1 py-0.5">Planned</span>
          </span>
        ))}
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-canvas"
        aria-labelledby="workspace-tab-canvas"
        hidden={activeTool !== "canvas"}
      >
        {document.nodes.length === 0 ? (
          <GenerationPanel
            projectId={project.id}
            document={document}
            onGenerated={(nextDocument) => {
              setState({
                status: "ready",
                data: {
                  project: { ...project, updatedAt: nextDocument.updatedAt },
                  document: nextDocument,
                },
              });
            }}
          />
        ) : (
          <AuditOverlayProvider findings={auditState?.findings ?? []}>
            <SimulationOverlayProvider result={canvasSimulation}>
              <div className="hidden md:block">
                <ArchitectureCanvasEditor
                  key={externalRevision}
                  projectId={project.id}
                  document={document}
                  onSaved={(saved) => {
                    setState({ status: "ready", data: saved });
                  }}
                />
              </div>
              <div className="flex flex-col gap-3 md:hidden">
                <p className="type-mono-data text-foreground-muted">
                  READ_ONLY · open on a larger screen to edit the canvas
                </p>
                <DocumentSummary document={document} />
              </div>
            </SimulationOverlayProvider>
          </AuditOverlayProvider>
        )}
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-audit"
        aria-labelledby="workspace-tab-audit"
        hidden={activeTool !== "audit"}
      >
        <AuditWorkspace
          document={document}
          auditState={auditState}
          onAuditStateChange={setAuditState}
        />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-simulate"
        aria-labelledby="workspace-tab-simulate"
        hidden={activeTool !== "simulate"}
      >
        <SimulationWorkspace
          document={document}
          simulationState={simulationState}
          onSimulationStateChange={setSimulationState}
        />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-recommend"
        aria-labelledby="workspace-tab-recommend"
        hidden={activeTool !== "recommend"}
      >
        <RecommendationWorkspace
          projectId={project.id}
          document={document}
          auditState={auditState}
          recommendationState={recommendationState}
          onApplied={(saved, nextState) => {
            // The document changed, so the audit is now stale by construction;
            // findings stay active until the user reruns it.
            setState({ status: "ready", data: saved });
            setRecommendationState(nextState);
            setExternalRevision((revision) => revision + 1);
          }}
        />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-import"
        aria-labelledby="workspace-tab-import"
        hidden={activeTool !== "import"}
      >
        <ImportWorkspace
          projectId={project.id}
          document={document}
          initialText={importDraft?.composeText ?? ""}
          initialOverrides={importDraft?.categoryOverrides ?? {}}
          onImported={(saved) => {
            // Replacing the document invalidates prior audits/sims and remounts
            // the canvas editor, exactly like applying a recommendation.
            setState({ status: "ready", data: saved });
            setImportDraft(null);
            setExternalRevision((revision) => revision + 1);
          }}
        />
      </div>
    </div>
  );
}
