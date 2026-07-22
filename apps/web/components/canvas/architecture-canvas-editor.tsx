"use client";

import "@xyflow/react/dist/style.css";

import {
  safeParseArchitectureDocument,
  type ArchitectureDocument,
  type ArchitectureEdgeKindModel,
} from "@axon/diagram-schema";
import {
  Button,
  CanvasToolbar,
  CanvasToolbarButton,
  CanvasToolbarSeparator,
  cx,
  useTheme,
} from "@axon/ui";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ArchitectureFlowEdge } from "./architecture-flow-edge";
import { ArchitectureFlowNode } from "./architecture-flow-node";
import { EdgeInspector } from "./edge-inspector";
import { NodeInspector } from "./node-inspector";
import {
  canvasStateToDocument,
  createUniqueEdgeId,
  createUniqueNodeId,
  documentToCanvasState,
  type ArchitectureNodeData,
  type ArchitectureNodeDataPatch,
  type CanvasEdge,
  type CanvasNode,
} from "@/lib/canvas/adapters";
import { HttpError, SessionExpiredError } from "@/lib/persistence/http-client";
import { isClientCloudMode } from "@/lib/persistence/client-mode";
import { saveRecoveryRecord } from "@/lib/persistence/session-recovery";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { type ProjectWithDocument } from "@/lib/projects/repository";

export const AUTOSAVE_DELAY_MS = 800;

/** Document equality ignoring updatedAt — used to suppress no-op autosaves. */
function isSameArchitecture(a: ArchitectureDocument, b: ArchitectureDocument): boolean {
  return JSON.stringify({ ...a, updatedAt: "" }) === JSON.stringify({ ...b, updatedAt: "" });
}

const NODE_TYPES = { architecture: ArchitectureFlowNode };
const EDGE_TYPES = { architecture: ArchitectureFlowEdge };

type SaveState = "saved" | "pending" | "saving" | "error" | "session-expired" | "conflict";

// The saved label distinguishes an account save (cloud) from browser-local
// storage, so a user always knows where their work actually lives.
const SAVED_TEXT = isClientCloudMode()
  ? "SAVED · stored in your AXON account"
  : "SAVED · stored locally in this browser";

const SAVE_TEXT: Record<SaveState, string> = {
  saved: SAVED_TEXT,
  pending: "UNSAVED_CHANGES · autosave pending",
  saving: "SAVING…",
  error: "SAVE_FAILED · changes are not saved to your AXON account yet",
  "session-expired": "SESSION_EXPIRED · sign in again to save",
  conflict: "REVISION_CONFLICT · this project changed elsewhere",
};

function ToolbarGlyph({ path }: { path: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export interface ArchitectureCanvasEditorProps {
  projectId: string;
  /** Initial document; the editor owns canvas state from here on. */
  document: ArchitectureDocument;
  onSaved?: (saved: ProjectWithDocument) => void;
}

function CanvasEditorInner({
  projectId,
  document: initialDocument,
  onSaved,
}: ArchitectureCanvasEditorProps) {
  const { resolvedTheme } = useTheme();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const [nodes, setNodes] = useState<CanvasNode[]>(
    () => documentToCanvasState(initialDocument).nodes,
  );
  const [edges, setEdges] = useState<CanvasEdge[]>(
    () => documentToCanvasState(initialDocument).edges,
  );

  const lastSavedRef = useRef(initialDocument);
  const hydratedRef = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);

  const persist = useCallback(
    async (currentNodes: readonly CanvasNode[], currentEdges: readonly CanvasEdge[]) => {
      setSaveState("saving");
      setSaveError(null);
      const candidate = canvasStateToDocument(
        lastSavedRef.current,
        currentNodes,
        currentEdges,
        new Date().toISOString(),
      );
      const validated = safeParseArchitectureDocument(candidate);
      if (!validated.success) {
        setSaveState("error");
        setSaveError(
          validated.error.issues[0]?.message ?? "The canvas is not a valid architecture.",
        );
        return;
      }
      // React Flow reports measured dimensions as node changes on mount, which
      // would otherwise bump updatedAt and make audits and simulations look
      // stale even though nothing about the architecture changed. Compare
      // everything except the timestamp and skip a write that changes nothing.
      if (isSameArchitecture(lastSavedRef.current, validated.data)) {
        setSaveState("saved");
        return;
      }
      try {
        const saved = await getProjectRepository().updateDocument(projectId, validated.data);
        lastSavedRef.current = saved.document;
        setSaveState("saved");
        onSaved?.(saved);
      } catch (error) {
        // A 401 must never look Saved. Preserve the unsaved architecture in a
        // minimal recovery record and surface the single recovery experience.
        if (error instanceof SessionExpiredError) {
          saveRecoveryRecord({
            projectId,
            expectedRevision: null,
            document: validated.data,
            safeRoute:
              typeof window !== "undefined"
                ? window.location.pathname + window.location.search
                : `/projects/${projectId}`,
          });
          setSaveState("session-expired");
          setSaveError(null);
          return;
        }
        if (error instanceof HttpError && error.status === 409) {
          setSaveState("conflict");
          setSaveError("Reload the server version to see the latest changes.");
          return;
        }
        // Network/server failure: in-memory edits are kept; the previously
        // saved server version is untouched.
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Could not save your changes.");
      }
    },
    [projectId, onSaved],
  );

  // The autosave effect must re-run only on real canvas changes, not when
  // callers hand us a new onSaved identity — otherwise each save re-schedules
  // itself forever. persist is read through a ref for that reason.
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Debounced, validated autosave. Continuous changes (drags) coalesce.
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    setSaveState((state) => (state === "saving" ? state : "pending"));
    const timer = window.setTimeout(() => {
      void persistRef.current(nodes, edges);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [nodes, edges]);

  // Unsaved-changes guard: edits only live in memory until persisted.
  useEffect(() => {
    if (saveState === "saved") {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [saveState]);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<CanvasEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (
      connection.source === null ||
      connection.target === null ||
      connection.source === connection.target
    ) {
      return;
    }
    setEdges((current) => {
      const duplicate = current.some(
        (edge) => edge.source === connection.source && edge.target === connection.target,
      );
      if (duplicate) {
        return current;
      }
      const id = createUniqueEdgeId(
        connection.source,
        connection.target,
        "sync",
        new Set(current.map((edge) => edge.id)),
      );
      return [
        ...current.map((edge) => ({ ...edge, selected: false })),
        {
          id,
          type: "architecture" as const,
          source: connection.source,
          target: connection.target,
          data: { kind: "sync" as const },
          selected: true,
        },
      ];
    });
  }, []);

  // Deleting a node removes its connections — dangling edges never persist.
  const onNodesDelete = useCallback((deleted: CanvasNode[]) => {
    const deletedIds = new Set(deleted.map((node) => node.id));
    setEdges((current) =>
      current.filter((edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target)),
    );
  }, []);

  const addNode = useCallback(() => {
    setNodes((current) => {
      const existingIds = new Set(current.map((node) => node.id));
      const id = createUniqueNodeId("new-service", existingIds);
      const stagger = current.length;
      const newNode: CanvasNode = {
        id,
        type: "architecture",
        position: { x: 80 + (stagger % 5) * 48, y: 80 + (stagger % 7) * 36 },
        data: { name: id, category: "Service" },
        selected: true,
      };
      return [...current.map((node) => ({ ...node, selected: false })), newNode];
    });
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
  }, []);

  const selectedNodes = nodes.filter((node) => node.selected === true);
  const selectedEdges = edges.filter((edge) => edge.selected === true);
  const selectionCount = selectedNodes.length + selectedEdges.length;

  const deleteSelected = useCallback(() => {
    const deletedNodeIds = new Set(
      nodes.filter((node) => node.selected === true).map((node) => node.id),
    );
    setNodes((current) => current.filter((node) => node.selected !== true));
    setEdges((current) =>
      current.filter(
        (edge) =>
          edge.selected !== true &&
          !deletedNodeIds.has(edge.source) &&
          !deletedNodeIds.has(edge.target),
      ),
    );
  }, [nodes]);

  const updateNodeData = useCallback((nodeId: string, patch: ArchitectureNodeDataPatch) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }
        // Explicit-undefined patch keys clear the field entirely.
        const merged = { ...node.data, ...patch };
        const nextData = Object.fromEntries(
          Object.entries(merged).filter(([, value]) => value !== undefined),
        ) as ArchitectureNodeData;
        return { ...node, data: nextData };
      }),
    );
  }, []);

  const updateEdgeKind = useCallback((edgeId: string, kind: ArchitectureEdgeKindModel) => {
    setEdges((current) =>
      current.map((edge) => (edge.id === edgeId ? { ...edge, data: { kind } } : edge)),
    );
  }, []);

  const singleNode =
    selectedNodes.length === 1 && selectedEdges.length === 0 ? selectedNodes[0] : undefined;
  const singleEdge =
    selectedEdges.length === 1 && selectedNodes.length === 0 ? selectedEdges[0] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CanvasToolbar label="Canvas tools">
          <Button variant="technical" size="sm" onClick={addNode}>
            Add Node
          </Button>
          <CanvasToolbarSeparator />
          <CanvasToolbarButton
            label="Zoom in"
            onClick={() => {
              void zoomIn();
            }}
          >
            <ToolbarGlyph path="M8 3v10M3 8h10" />
          </CanvasToolbarButton>
          <CanvasToolbarButton
            label="Zoom out"
            onClick={() => {
              void zoomOut();
            }}
          >
            <ToolbarGlyph path="M3 8h10" />
          </CanvasToolbarButton>
          <CanvasToolbarButton
            label="Fit view"
            onClick={() => {
              void fitView({ padding: 0.15 });
            }}
          >
            <ToolbarGlyph path="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
          </CanvasToolbarButton>
          <CanvasToolbarSeparator />
          <Button
            variant="technical"
            size="sm"
            onClick={deleteSelected}
            disabled={selectionCount === 0}
          >
            Delete Selected
          </Button>
          <Button
            variant="technical"
            size="sm"
            onClick={() => {
              void persist(nodes, edges);
            }}
            disabled={saveState === "saving"}
          >
            Save Now
          </Button>
        </CanvasToolbar>
        <div className="flex items-center gap-3">
          <p
            role="status"
            aria-live="polite"
            aria-label="Save status"
            className={cx(
              "type-mono-data",
              saveState === "error" ? "text-critical" : "text-foreground-muted",
            )}
          >
            {saveState === "error" && saveError !== null
              ? `${SAVE_TEXT.error} · ${saveError}`
              : SAVE_TEXT[saveState]}
          </p>
          {saveState === "error" && (
            <Button
              variant="technical"
              size="sm"
              onClick={() => {
                void persist(nodes, edges);
              }}
            >
              Retry Save
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="h-[560px] min-w-0 flex-1 overflow-hidden rounded-module border-2 border-border-strong bg-surface">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            colorMode={resolvedTheme}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            nodesFocusable
            edgesFocusable
            deleteKeyCode={["Backspace", "Delete"]}
            defaultEdgeOptions={{ type: "architecture" }}
          >
            <Background variant={BackgroundVariant.Lines} gap={40} color="var(--color-grid)" />
          </ReactFlow>
        </div>
        <aside
          aria-label="Inspector"
          className="w-full shrink-0 border-2 border-border-strong bg-surface p-4 xl:w-80"
        >
          {singleNode !== undefined ? (
            <NodeInspector
              node={singleNode}
              groups={lastSavedRef.current.groups}
              onChange={(patch) => {
                updateNodeData(singleNode.id, patch);
              }}
              onDelete={deleteSelected}
            />
          ) : singleEdge !== undefined ? (
            <EdgeInspector
              edge={singleEdge}
              nodes={nodes}
              onKindChange={(kind) => {
                updateEdgeKind(singleEdge.id, kind);
              }}
              onDelete={deleteSelected}
            />
          ) : selectionCount > 1 ? (
            <div className="flex flex-col gap-3">
              <p className="type-label-caps text-foreground-muted">Selection</p>
              <p className="type-body-md">{selectionCount} elements selected.</p>
              <Button
                variant="technical"
                size="sm"
                onClick={deleteSelected}
                className="self-start hover:border-critical hover:text-critical"
              >
                Delete Selected
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="type-label-caps text-foreground-muted">Inspector</p>
              <p className="type-body-md text-foreground-muted">
                Select a node or connection to edit it. Drag from a node&apos;s right handle to
                another node to connect them.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function ArchitectureCanvasEditor(props: ArchitectureCanvasEditorProps) {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner {...props} />
    </ReactFlowProvider>
  );
}
