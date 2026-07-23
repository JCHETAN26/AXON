import {
  type ArchitectureDocument,
  type ArchitectureEdgeKindModel,
  parseArchitectureDocument,
} from "@axon/diagram-schema";

import { computeArchitectureAwareLayout } from "./adapters";

export interface LayoutBenchmarkSize {
  readonly nodeCount: number;
  readonly groupCount?: number;
  readonly now?: string;
}

export interface LayoutQualityOptions {
  readonly nodeWidth?: number;
  readonly nodeHeight?: number;
  readonly minGap?: number;
}

export interface LayoutBoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutQualityReport {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly positionedNodeCount: number;
  readonly missingNodeIds: readonly string[];
  readonly overlappingPairs: readonly { readonly first: string; readonly second: string }[];
  readonly leftToRightEdgeCount: number;
  readonly backwardEdgeCount: number;
  readonly boundingBox: LayoutBoundingBox;
}

export interface ArchitectureLayoutBenchmark {
  readonly iterations: number;
  readonly totalMilliseconds: number;
  readonly millisecondsPerRun: number;
  readonly quality: LayoutQualityReport;
}

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 96;
const DEFAULT_MIN_GAP = 24;
const DEFAULT_NOW = "2026-07-23T00:00:00.000Z";
const EDGE_KINDS: readonly ArchitectureEdgeKindModel[] = ["sync", "async", "data", "telemetry"];

function nowMilliseconds(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function emptyBoundingBox(): LayoutBoundingBox {
  return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
}

export function buildSyntheticArchitectureDocument({
  nodeCount,
  groupCount = Math.max(1, Math.min(8, Math.ceil(nodeCount / 20))),
  now = DEFAULT_NOW,
}: LayoutBenchmarkSize): ArchitectureDocument {
  const boundedNodeCount = Math.max(0, Math.floor(nodeCount));
  const boundedGroupCount = Math.max(
    1,
    Math.min(Math.floor(groupCount), Math.max(1, boundedNodeCount)),
  );
  const groups = Array.from({ length: boundedGroupCount }, (_, index) => ({
    id: `group-${index + 1}`,
    label: `Benchmark Group ${index + 1}`,
  }));
  const nodes = Array.from({ length: boundedNodeCount }, (_, index) => ({
    id: `service-${index + 1}`,
    name: `Service ${String(index + 1).padStart(3, "0")}`,
    category:
      index % 5 === 0
        ? "gateway"
        : index % 5 === 1
          ? "compute"
          : index % 5 === 2
            ? "data"
            : index % 5 === 3
              ? "queue"
              : "telemetry",
    groupId: groups[index % groups.length]?.id,
  }));
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `${node.id}--${nodes[index + 1]?.id ?? node.id}--${EDGE_KINDS[index % EDGE_KINDS.length]}`,
    source: node.id,
    target: nodes[index + 1]?.id ?? node.id,
    kind: EDGE_KINDS[index % EDGE_KINDS.length],
  }));

  return parseArchitectureDocument({
    schemaVersion: "1.0",
    id: `layout-benchmark-${boundedNodeCount}`,
    projectId: "layout-benchmark",
    name: `${boundedNodeCount} service benchmark architecture`,
    description: "Synthetic AXON architecture used for deterministic layout quality checks.",
    createdAt: now,
    updatedAt: now,
    source: { kind: "sample", label: "AXON layout benchmark generator" },
    assumptions: [
      {
        id: "synthetic-topology",
        label: "Synthetic topology",
        value: "Linear dependency chain for deterministic layout regression checks.",
      },
    ],
    groups,
    nodes,
    edges,
    metadata: { generator: "axon-layout-benchmark" },
  });
}

export function evaluateArchitectureLayout(
  document: ArchitectureDocument,
  positions: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
  options: LayoutQualityOptions = {},
): LayoutQualityReport {
  const nodeWidth = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
  const minGap = options.minGap ?? DEFAULT_MIN_GAP;
  const positionedNodes = document.nodes
    .map((node) => ({ node, position: positions.get(node.id) }))
    .filter(
      (
        entry,
      ): entry is {
        node: (typeof document.nodes)[number];
        position: { readonly x: number; readonly y: number };
      } => entry.position !== undefined,
    );
  const missingNodeIds = document.nodes
    .filter((node) => positions.get(node.id) === undefined)
    .map((node) => node.id);

  const overlappingPairs: { first: string; second: string }[] = [];
  for (let leftIndex = 0; leftIndex < positionedNodes.length; leftIndex += 1) {
    const left = positionedNodes[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < positionedNodes.length; rightIndex += 1) {
      const right = positionedNodes[rightIndex];
      if (right === undefined) continue;
      const overlapsX =
        left.position.x < right.position.x + nodeWidth + minGap &&
        left.position.x + nodeWidth + minGap > right.position.x;
      const overlapsY =
        left.position.y < right.position.y + nodeHeight + minGap &&
        left.position.y + nodeHeight + minGap > right.position.y;
      if (overlapsX && overlapsY) {
        overlappingPairs.push({ first: left.node.id, second: right.node.id });
      }
    }
  }

  let leftToRightEdgeCount = 0;
  let backwardEdgeCount = 0;
  for (const edge of document.edges) {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (source === undefined || target === undefined) continue;
    if (target.x >= source.x) {
      leftToRightEdgeCount += 1;
    } else {
      backwardEdgeCount += 1;
    }
  }

  const boundingBox =
    positionedNodes.length === 0
      ? emptyBoundingBox()
      : positionedNodes.reduce<LayoutBoundingBox>(
          (box, entry) => {
            const minX = Math.min(box.minX, entry.position.x);
            const minY = Math.min(box.minY, entry.position.y);
            const maxX = Math.max(box.maxX, entry.position.x + nodeWidth);
            const maxY = Math.max(box.maxY, entry.position.y + nodeHeight);
            return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
          },
          {
            minX: positionedNodes[0]?.position.x ?? 0,
            minY: positionedNodes[0]?.position.y ?? 0,
            maxX: (positionedNodes[0]?.position.x ?? 0) + nodeWidth,
            maxY: (positionedNodes[0]?.position.y ?? 0) + nodeHeight,
            width: nodeWidth,
            height: nodeHeight,
          },
        );

  return {
    nodeCount: document.nodes.length,
    edgeCount: document.edges.length,
    positionedNodeCount: positionedNodes.length,
    missingNodeIds,
    overlappingPairs,
    leftToRightEdgeCount,
    backwardEdgeCount,
    boundingBox,
  };
}

export function benchmarkArchitectureLayout(
  document: ArchitectureDocument,
  iterations = 5,
): ArchitectureLayoutBenchmark {
  const boundedIterations = Math.max(1, Math.floor(iterations));
  let layout = new Map<string, { x: number; y: number }>();
  const startedAt = nowMilliseconds();
  for (let index = 0; index < boundedIterations; index += 1) {
    layout = computeArchitectureAwareLayout(document, { preserveExistingPositions: false });
  }
  const totalMilliseconds = nowMilliseconds() - startedAt;
  return {
    iterations: boundedIterations,
    totalMilliseconds,
    millisecondsPerRun: totalMilliseconds / boundedIterations,
    quality: evaluateArchitectureLayout(document, layout),
  };
}
