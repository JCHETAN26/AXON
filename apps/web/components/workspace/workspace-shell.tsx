"use client";

import { type ProjectAuditState } from "@axon/architecture-audit";
import {
  BASELINE_SCENARIO,
  runSimulation,
  type CalibrationResult,
  type ProjectSimulationState,
  type SimulationResult,
  type TelemetryProvider,
} from "@axon/architecture-simulation";
import { type ProjectRecommendationState } from "@axon/architecture-recommendations";
import { estimateArchitectureCost, type CostEstimate } from "@axon/architecture-cost";
import { buttonClasses, cx } from "@axon/ui";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ApprovalsWorkspace } from "./approvals-workspace";
import { AuditWorkspace } from "./audit-workspace";
import { CommentsWorkspace } from "./comments-workspace";
import { CopilotWorkspace } from "./copilot-workspace";
import { CostWorkspace } from "./cost-workspace";
import { DocumentSummary } from "./document-summary";
import { GenerationPanel } from "./generation-panel";
import { HistoryWorkspace } from "./history-workspace";
import { IconRegistryWorkspace } from "./icon-registry-workspace";
import { ImportWorkspace } from "./import-workspace";
import { MultiCloudWorkspace } from "./multi-cloud-workspace";
import { PresentationWorkspace } from "./presentation-workspace";
import { RecommendationWorkspace } from "./recommendation-workspace";
import { SharingWorkspace } from "./sharing-workspace";
import { SimulationWorkspace } from "./simulation-workspace";
import { TelemetryCalibrationWorkspace, type TelemetrySourceItem } from "./telemetry-workspace";
import { ArchitectureCanvasEditor } from "@/components/canvas/architecture-canvas-editor";
import { AuditOverlayProvider } from "@/components/canvas/audit-overlay-context";
import { CostOverlayProvider } from "@/components/canvas/cost-overlay-context";
import { SimulationOverlayProvider } from "@/components/canvas/simulation-overlay-context";
import { getAuditRepository } from "@/lib/audit/get-audit-repository";
import { defaultUsageFor } from "@/lib/cost/default-usage";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { type ProjectWithDocument } from "@/lib/projects/repository";
import { getImportRepository } from "@/lib/import/get-import-repository";
import { type ImportDraft } from "@/lib/import/import-repository";
import { getRecommendationRepository } from "@/lib/recommendations/get-recommendation-repository";
import { getSimulationRepository } from "@/lib/simulation/get-simulation-repository";
import {
  buildSimulationState,
  initialProfile,
  withCapacityProfile,
} from "@/lib/simulation/simulation-view";

type WorkspaceTool =
  | "canvas"
  | "audit"
  | "simulate"
  | "monitor"
  | "cost"
  | "multi-cloud"
  | "icons"
  | "present"
  | "share"
  | "comments"
  | "copilot"
  | "approvals"
  | "recommend"
  | "import"
  | "history";

const TOOL_LABEL: Record<WorkspaceTool, string> = {
  canvas: "Canvas",
  audit: "Audit",
  simulate: "Simulate",
  monitor: "Monitor",
  cost: "Cost",
  "multi-cloud": "Multi-cloud",
  icons: "Icons",
  present: "Present",
  share: "Share",
  comments: "Comments",
  copilot: "Copilot",
  approvals: "Approvals",
  recommend: "Recommend",
  import: "Import",
  history: "History & Drift",
};
const TOOLS: readonly WorkspaceTool[] = [
  "canvas",
  "audit",
  "simulate",
  "monitor",
  "cost",
  "multi-cloud",
  "icons",
  "present",
  "share",
  "comments",
  "copilot",
  "approvals",
  "recommend",
  "import",
  "history",
];

type ShellState =
  { status: "loading" } | { status: "not-found" } | { status: "ready"; data: ProjectWithDocument };

type TelemetryState =
  | { status: "idle" | "loading"; sources: TelemetrySourceItem[]; calibration: CalibrationResult }
  | { status: "ready"; sources: TelemetrySourceItem[]; calibration: CalibrationResult }
  | {
      status: "error";
      sources: TelemetrySourceItem[];
      calibration: CalibrationResult;
      message: string;
    };

const EMPTY_CALIBRATION: CalibrationResult = {
  calibratedProfile: { components: {} },
  calibratedComponentCount: 0,
  calibrationConfidence: "medium",
};

export function WorkspaceShell({ projectId }: { projectId: string }) {
  const [state, setState] = useState<ShellState>({ status: "loading" });
  const [activeTool, setActiveTool] = useState<WorkspaceTool>("canvas");
  const [auditState, setAuditState] = useState<ProjectAuditState | null>(null);
  const [simulationState, setSimulationState] = useState<ProjectSimulationState | null>(null);
  const [recommendationState, setRecommendationState] = useState<ProjectRecommendationState | null>(
    null,
  );
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  const [telemetryState, setTelemetryState] = useState<TelemetryState>({
    status: "idle",
    sources: [],
    calibration: EMPTY_CALIBRATION,
  });
  const telemetryLoadedProjectRef = useRef<string | null>(null);
  // Bumped only when the document is replaced from outside the canvas editor
  // (applying a recommendation). The editor owns its canvas state once
  // mounted, so it must be remounted to pick the new document up — otherwise
  // its next autosave would write stale in-memory state over the change.
  const [externalRevision, setExternalRevision] = useState(0);
  const tabRefs = useRef<Partial<Record<WorkspaceTool, HTMLButtonElement | null>>>({});

  useEffect(() => {
    let cancelled = false;
    telemetryLoadedProjectRef.current = null;
    setTelemetryState({
      status: "idle",
      sources: [],
      calibration: EMPTY_CALIBRATION,
    });
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

  useEffect(() => {
    if (activeTool !== "monitor" || telemetryLoadedProjectRef.current === projectId) return;
    let cancelled = false;
    telemetryLoadedProjectRef.current = projectId;

    async function loadTelemetry() {
      setTelemetryState((current) => ({ ...current, status: "loading" }));
      try {
        const [sourcesResponse, calibrationResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/telemetry/sources`),
          fetch(`/api/projects/${projectId}/telemetry/metrics`),
        ]);
        if (!sourcesResponse.ok || !calibrationResponse.ok) {
          throw new Error("Could not load telemetry calibration data.");
        }
        const sourcesJson = (await sourcesResponse.json()) as { sources?: TelemetrySourceItem[] };
        const calibration = (await calibrationResponse.json()) as CalibrationResult;
        if (!cancelled) {
          setTelemetryState({
            status: "ready",
            sources: sourcesJson.sources ?? [],
            calibration,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setTelemetryState((current) => ({
            ...current,
            status: "error",
            message:
              error instanceof Error ? error.message : "Could not load telemetry calibration data.",
          }));
        }
      }
    }

    void loadTelemetry();
    return () => {
      cancelled = true;
    };
  }, [activeTool, projectId]);

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

  // Cost estimate for the copilot, derived the same way the cost overlay is, so
  // a "what does this cost?" answer matches what the Cost workspace shows.
  const copilotCostEstimate = useMemo<CostEstimate | null>(() => {
    if (state.status !== "ready") return null;
    return estimateArchitectureCost({
      document: state.data.document,
      provider: "aws",
      region: "us-east-1",
      usageProfile: defaultUsageFor(state.data.document),
    });
  }, [state]);

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

  const registerTelemetrySource = async (
    provider: TelemetryProvider,
    name: string,
    endpointUrl: string,
  ) => {
    const response = await fetch(`/api/projects/${project.id}/telemetry/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, name, endpointUrl }),
    });
    if (!response.ok) {
      throw new Error("Could not register telemetry source.");
    }
    const payload = (await response.json()) as { sourceId: string };
    setTelemetryState((current) => ({
      status: "ready",
      calibration: current.calibration,
      sources: [
        {
          id: payload.sourceId,
          provider,
          name,
          endpointUrl,
          status: "connected",
        },
        ...current.sources,
      ],
    }));
  };

  const applyTelemetryCalibration = async () => {
    const profile = simulationState?.profile ?? initialProfile();
    const scenario = simulationState?.scenario ?? BASELINE_SCENARIO;
    const nextProfile = withCapacityProfile(profile, {
      ...profile.capacityProfile,
      components: {
        ...profile.capacityProfile.components,
        ...telemetryState.calibration.calibratedProfile.components,
      },
    });
    const result = runSimulation({
      document,
      scenario,
      capacityProfile: nextProfile.capacityProfile,
    });
    const nextState = buildSimulationState({
      document,
      scenario,
      profile: nextProfile,
      result,
      now: new Date().toISOString(),
    });
    await getSimulationRepository().saveSimulationState(nextState);
    setSimulationState(nextState);
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

      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Workspace tools"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
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
                "type-label-caps shrink-0 whitespace-nowrap border-2 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-accent",
                activeTool === tool
                  ? "border-accent bg-accent-muted text-foreground"
                  : "border-border text-foreground-muted hover:border-border-strong",
              )}
            >
              {TOOL_LABEL[tool]}
            </button>
          ))}
        </div>
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
            <CostOverlayProvider document={document}>
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
            </CostOverlayProvider>
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
        id="workspace-panel-monitor"
        aria-labelledby="workspace-tab-monitor"
        hidden={activeTool !== "monitor"}
      >
        {telemetryState.status === "error" ? (
          <div role="alert" className="border-2 border-danger bg-danger-muted p-4">
            <p className="type-label-caps text-danger">Telemetry unavailable</p>
            <p className="type-body-md mt-2 text-foreground">{telemetryState.message}</p>
          </div>
        ) : (
          <TelemetryCalibrationWorkspace
            projectId={project.id}
            sources={telemetryState.sources}
            calibrationResult={telemetryState.calibration}
            onRegisterSource={registerTelemetrySource}
            onApplyCalibration={applyTelemetryCalibration}
          />
        )}
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
        id="workspace-panel-cost"
        aria-labelledby="workspace-tab-cost"
        hidden={activeTool !== "cost"}
      >
        <CostWorkspace document={document} />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-multi-cloud"
        aria-labelledby="workspace-tab-multi-cloud"
        hidden={activeTool !== "multi-cloud"}
      >
        <MultiCloudWorkspace document={document} />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-icons"
        aria-labelledby="workspace-tab-icons"
        hidden={activeTool !== "icons"}
      >
        <IconRegistryWorkspace />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-present"
        aria-labelledby="workspace-tab-present"
        hidden={activeTool !== "present"}
      >
        <PresentationWorkspace document={document} />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-share"
        aria-labelledby="workspace-tab-share"
        hidden={activeTool !== "share"}
      >
        <SharingWorkspace projectId={project.id} />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-comments"
        aria-labelledby="workspace-tab-comments"
        hidden={activeTool !== "comments"}
      >
        <CommentsWorkspace document={document} />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-copilot"
        aria-labelledby="workspace-tab-copilot"
        hidden={activeTool !== "copilot"}
      >
        <CopilotWorkspace
          document={document}
          auditState={auditState}
          costEstimate={copilotCostEstimate}
          simulation={canvasSimulation}
        />
      </div>

      <div
        role="tabpanel"
        id="workspace-panel-approvals"
        aria-labelledby="workspace-tab-approvals"
        hidden={activeTool !== "approvals"}
      >
        <ApprovalsWorkspace document={document} />
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

      <div
        role="tabpanel"
        id="workspace-panel-history"
        aria-labelledby="workspace-tab-history"
        hidden={activeTool !== "history"}
      >
        <HistoryWorkspace
          projectId={project.id}
          document={document}
          snapshots={[]}
          driftItems={[]}
          onRestoreSnapshot={(_snapshotId) => {
            void _snapshotId;
          }}
          onResolveDrift={(_driftId, _decision) => {
            void _driftId;
            void _decision;
          }}
        />
      </div>
    </div>
  );
}
