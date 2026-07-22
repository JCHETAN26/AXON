import { type GeneratedArchitectureDraft } from "./draft-schema";

export interface NodePosition {
  x: number;
  y: number;
}

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 140;
const MARGIN_X = 40;
const MARGIN_Y = 60;

/**
 * Deterministic grid layout: one column per group (draft order), ungrouped
 * nodes in a trailing column, nodes stacked in draft order. AXON owns
 * coordinates — models never emit them.
 */
export function assignPositions(
  draft: GeneratedArchitectureDraft,
): ReadonlyMap<string, NodePosition> {
  const columns: string[][] = draft.groups.map((group) =>
    draft.nodes.filter((node) => node.groupKey === group.key).map((node) => node.key),
  );
  const ungrouped = draft.nodes
    .filter((node) => node.groupKey === undefined)
    .map((node) => node.key);
  if (ungrouped.length > 0) {
    columns.push(ungrouped);
  }

  const positions = new Map<string, NodePosition>();
  columns.forEach((column, columnIndex) => {
    column.forEach((nodeKey, rowIndex) => {
      positions.set(nodeKey, {
        x: MARGIN_X + columnIndex * COLUMN_WIDTH,
        y: MARGIN_Y + rowIndex * ROW_HEIGHT,
      });
    });
  });
  return positions;
}
