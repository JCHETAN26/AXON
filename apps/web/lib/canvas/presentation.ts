import { type ArchitectureDocument } from "@axon/diagram-schema";

import { renderArchitectureSvg } from "./export-svg";

export interface PresentationStep {
  readonly id: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly summary: string;
  readonly bullets: readonly string[];
}

export interface PresentationRenderOptions {
  readonly speakerNotesByStepId?: Readonly<Record<string, string>>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function connectionLabel(count: number): string {
  return count === 1 ? "1 connection" : `${count} connections`;
}

export function buildPresentationSteps(document: ArchitectureDocument): PresentationStep[] {
  const overview: PresentationStep = {
    id: "overview",
    eyebrow: "Overview",
    title: document.name,
    summary:
      document.description ??
      `${document.nodes.length} services across ${document.groups.length} groups with ${connectionLabel(document.edges.length)}.`,
    bullets: [
      `${document.nodes.length} services`,
      `${connectionLabel(document.edges.length)}`,
      `${document.groups.length} groups`,
      `${document.assumptions.length} assumptions`,
    ],
  };

  const groupSteps = document.groups.map((group): PresentationStep => {
    const nodes = document.nodes.filter((node) => node.groupId === group.id);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const relatedEdges = document.edges.filter(
      (edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target),
    );
    return {
      id: `group-${group.id}`,
      eyebrow: "Subsystem",
      title: group.label,
      summary: `${nodes.length} services participate in ${connectionLabel(relatedEdges.length)}.`,
      bullets:
        nodes.length === 0
          ? ["No services assigned to this group."]
          : nodes.map((node) => `${node.name} · ${node.category}`),
    };
  });

  const flowSteps = document.edges.slice(0, 8).map((edge): PresentationStep => {
    const source = document.nodes.find((node) => node.id === edge.source);
    const target = document.nodes.find((node) => node.id === edge.target);
    return {
      id: `flow-${edge.id}`,
      eyebrow: `${edge.kind} flow`,
      title: `${source?.name ?? edge.source} -> ${target?.name ?? edge.target}`,
      summary: `This ${edge.kind} connection is part of the current architecture model.`,
      bullets: [
        `Source: ${source?.category ?? "unknown"}`,
        `Target: ${target?.category ?? "unknown"}`,
        `Connection id: ${edge.id}`,
      ],
    };
  });

  const assumptionStep: PresentationStep = {
    id: "assumptions",
    eyebrow: "Assumptions",
    title: "Model Inputs",
    summary:
      document.assumptions.length === 0
        ? "No explicit assumptions are attached to this architecture."
        : "These assumptions shape audits, simulations, estimates, and recommendations.",
    bullets:
      document.assumptions.length === 0
        ? ["Add assumptions when traffic, scale, reliability, cost, or compliance inputs matter."]
        : document.assumptions.map((assumption) => `${assumption.label}: ${assumption.value}`),
  };

  return [overview, ...groupSteps, ...flowSteps, assumptionStep];
}

export function renderPresentationHtml(
  document: ArchitectureDocument,
  options: PresentationRenderOptions = {},
): string {
  const svg = renderArchitectureSvg(document);
  const steps = buildPresentationSteps(document);
  const stepMarkup = steps
    .map((step, index) => {
      const speakerNotes = options.speakerNotesByStepId?.[step.id]?.trim();
      const notesMarkup =
        speakerNotes === undefined || speakerNotes.length === 0
          ? ""
          : `<section class="notes" aria-label="Speaker notes"><p class="eyebrow">Speaker notes</p><p>${escapeHtml(speakerNotes)}</p></section>`;
      return `<article id="${escapeHtml(step.id)}"><p class="eyebrow">Step ${index + 1} · ${escapeHtml(step.eyebrow)}</p><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.summary)}</p><ul>${step.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>${notesMarkup}</article>`;
    })
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(document.name)} presentation export</title><style>:root{color-scheme:light dark;font-family:Inter,system-ui,sans-serif;background:Canvas;color:CanvasText}body{margin:0;padding:32px}main{display:grid;gap:28px}header{border-bottom:2px solid CanvasText;padding-bottom:16px}.meta,.eyebrow{font:12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;opacity:.72}h1{font-size:32px;line-height:1.1;margin:0}h2{font-size:22px;line-height:1.2;margin:8px 0}p{max-width:76ch;line-height:1.5}figure{margin:0;overflow:auto;border:2px solid CanvasText;padding:16px}.steps{display:grid;gap:16px}article{border-top:1px solid color-mix(in srgb,CanvasText 25%,transparent);padding-top:16px}.notes{border-left:3px solid color-mix(in srgb,CanvasText 40%,transparent);margin-top:14px;padding-left:14px}ul{display:grid;gap:8px;margin:12px 0 0;padding-left:20px}</style></head><body><main><header><p class="meta">AXON presentation export · schema v${escapeHtml(document.schemaVersion)} · ${escapeHtml(document.updatedAt)}</p><h1>${escapeHtml(document.name)}</h1></header><figure>${svg}</figure><section class="steps" aria-label="Presentation walkthrough">${stepMarkup}</section></main></body></html>`;
}
