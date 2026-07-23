"use client";

import { type ArchitectureGroupModel } from "@axon/diagram-schema";
import { Button, cx } from "@axon/ui";

import { type ArchitectureNodeDataPatch, type CanvasNode } from "@/lib/canvas/adapters";
import { ARCHITECTURE_ICON_REGISTRY } from "@/lib/icons/architecture-icon-registry";

const FIELD_CLASSES = cx(
  "type-body-md mt-1.5 w-full rounded-control border-2 border-border-strong bg-surface px-2.5 py-2",
  "text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none",
);

export interface NodeInspectorProps {
  node: CanvasNode;
  groups: readonly ArchitectureGroupModel[];
  /** Partial data patch; a key set to undefined clears that field. */
  onChange: (patch: ArchitectureNodeDataPatch) => void;
  onDelete: () => void;
}

export function NodeInspector({ node, groups, onChange, onDelete }: NodeInspectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="type-label-caps text-foreground-muted">Node</p>
      <div>
        <label htmlFor="inspector-node-name" className="type-label-caps text-foreground-muted">
          Service name
        </label>
        <input
          id="inspector-node-name"
          type="text"
          value={node.data.name}
          maxLength={80}
          onChange={(event) => {
            onChange({ name: event.target.value });
          }}
          className={FIELD_CLASSES}
        />
      </div>
      <div>
        <label htmlFor="inspector-node-category" className="type-label-caps text-foreground-muted">
          Category
        </label>
        <input
          id="inspector-node-category"
          type="text"
          value={node.data.category}
          maxLength={80}
          onChange={(event) => {
            onChange({ category: event.target.value });
          }}
          className={FIELD_CLASSES}
        />
      </div>
      <div>
        <label htmlFor="inspector-node-group" className="type-label-caps text-foreground-muted">
          Group
        </label>
        <select
          id="inspector-node-group"
          value={node.data.groupId ?? ""}
          onChange={(event) => {
            onChange({ groupId: event.target.value === "" ? undefined : event.target.value });
          }}
          className={FIELD_CLASSES}
        >
          <option value="">No group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="inspector-node-meta" className="type-label-caps text-foreground-muted">
          Technical note
        </label>
        <input
          id="inspector-node-meta"
          type="text"
          value={node.data.meta ?? ""}
          maxLength={80}
          placeholder="e.g. pg16 · 3 replicas"
          onChange={(event) => {
            onChange({ meta: event.target.value === "" ? undefined : event.target.value });
          }}
          className={FIELD_CLASSES}
        />
      </div>
      <div>
        <label htmlFor="inspector-node-icon" className="type-label-caps text-foreground-muted">
          Icon
        </label>
        <select
          id="inspector-node-icon"
          value={node.data.iconId ?? ""}
          onChange={(event) => {
            onChange({ iconId: event.target.value === "" ? undefined : event.target.value });
          }}
          className={FIELD_CLASSES}
        >
          <option value="">Auto</option>
          {ARCHITECTURE_ICON_REGISTRY.map((icon) => (
            <option key={icon.id} value={icon.id}>
              {icon.service} ({icon.provider})
            </option>
          ))}
        </select>
      </div>
      <label htmlFor="inspector-node-planned" className="flex cursor-pointer items-center gap-2.5">
        <input
          id="inspector-node-planned"
          type="checkbox"
          checked={node.data.planned === true}
          onChange={(event) => {
            onChange({ planned: event.target.checked ? true : undefined });
          }}
          className="size-4 accent-(--color-accent)"
        />
        <span className="type-label-caps text-foreground">Planned (not yet running)</span>
      </label>
      <p className="type-mono-data text-foreground-muted">id: {node.id}</p>
      <Button
        variant="technical"
        size="sm"
        onClick={onDelete}
        className="self-start hover:border-critical hover:text-critical"
      >
        Delete Node
      </Button>
    </div>
  );
}
