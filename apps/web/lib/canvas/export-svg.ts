import { type ArchitectureDocument } from "@axon/diagram-schema";

import { computeArchitectureAwareLayout } from "./adapters";
import {
  findArchitectureIconById,
  resolveArchitectureIcon,
} from "@/lib/icons/architecture-icon-registry";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 88;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderArchitectureSvg(document: ArchitectureDocument): string {
  const layout = computeArchitectureAwareLayout(document);
  const nodes = document.nodes.map((node) => ({
    ...node,
    position: layout.get(node.id) ?? { x: 40, y: 60 },
    icon:
      findArchitectureIconById(node.iconId) ??
      resolveArchitectureIcon({
        category: node.category,
        name: node.name,
        ...(node.meta !== undefined && { meta: node.meta }),
      }),
  }));
  const maxX = Math.max(...nodes.map((node) => node.position.x + NODE_WIDTH), NODE_WIDTH);
  const maxY = Math.max(...nodes.map((node) => node.position.y + NODE_HEIGHT), NODE_HEIGHT);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeMarkup = document.edges
    .map((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (source === undefined || target === undefined) return "";
      const x1 = source.position.x + NODE_WIDTH;
      const y1 = source.position.y + NODE_HEIGHT / 2;
      const x2 = target.position.x;
      const y2 = target.position.y + NODE_HEIGHT / 2;
      const midX = Math.round((x1 + x2) / 2);
      return `<g id="${escapeXml(edge.id)}"><path d="M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}" fill="none" stroke="currentColor" stroke-width="2"/><text x="${midX + 6}" y="${Math.min(y1, y2) + 16}" class="edge-label">${escapeXml(edge.kind)}</text></g>`;
    })
    .join("");
  const nodeMarkup = nodes
    .map((node) => {
      const x = node.position.x;
      const y = node.position.y;
      return `<g id="${escapeXml(node.id)}" transform="translate(${x} ${y})"><rect width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="4" class="node"/><text x="16" y="24" class="category">${escapeXml(node.icon.service)} · ${escapeXml(node.category)}</text><text x="16" y="52" class="name">${escapeXml(node.name)}</text>${node.meta !== undefined ? `<text x="16" y="72" class="meta">${escapeXml(node.meta)}</text>` : ""}</g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX + 40}" height="${maxY + 40}" viewBox="0 0 ${maxX + 40} ${maxY + 40}" role="img" aria-label="${escapeXml(document.name)} architecture diagram"><style>.node{fill:Canvas;stroke:CanvasText;stroke-width:2}.category,.edge-label{font:11px monospace;fill:CanvasText;opacity:.7}.name{font:600 15px sans-serif;fill:CanvasText}.meta{font:11px monospace;fill:CanvasText;opacity:.8}</style><title>${escapeXml(document.name)}</title>${edgeMarkup}${nodeMarkup}</svg>`;
}

export function renderArchitectureHtml(document: ArchitectureDocument): string {
  const svg = renderArchitectureSvg(document);
  const description =
    document.description === undefined ? "" : `<p>${escapeXml(document.description)}</p>`;
  const assumptions = document.assumptions
    .map(
      (assumption) =>
        `<li><span>${escapeXml(assumption.label)}</span><strong>${escapeXml(assumption.value)}</strong></li>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeXml(document.name)} architecture export</title><style>:root{color-scheme:light dark;font-family:Inter,system-ui,sans-serif;background:Canvas;color:CanvasText}body{margin:0;padding:32px}main{display:grid;gap:24px}header{border-bottom:2px solid CanvasText;padding-bottom:16px}h1{font-size:28px;line-height:1.1;margin:0}p{max-width:72ch;line-height:1.5}.meta{font:12px ui-monospace,monospace;opacity:.72}figure{margin:0;overflow:auto;border:2px solid CanvasText;padding:16px}ul{display:grid;gap:8px;padding:0;list-style:none}li{display:flex;gap:16px;justify-content:space-between;border-top:1px solid color-mix(in srgb,CanvasText 25%,transparent);padding-top:8px}</style></head><body><main><header><p class="meta">AXON architecture export · schema v${escapeXml(document.schemaVersion)} · ${escapeXml(document.updatedAt)}</p><h1>${escapeXml(document.name)}</h1>${description}</header><figure>${svg}</figure><section aria-labelledby="assumptions-heading"><h2 id="assumptions-heading">Assumptions</h2><ul>${assumptions}</ul></section></main></body></html>`;
}

export interface RenderArchitecturePngOptions {
  readonly scale?: number;
  readonly background?: string;
}

function readSvgDimension(svg: string, attribute: "width" | "height"): number {
  const value = svg.match(new RegExp(`${attribute}="([0-9]+)"`))?.[1];
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Cannot determine SVG ${attribute}.`);
  }
  return parsed;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Could not load architecture SVG for PNG export."));
    };
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("Could not encode architecture PNG."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function renderArchitecturePngBlob(
  architecture: ArchitectureDocument,
  options: RenderArchitecturePngOptions = {},
): Promise<Blob> {
  const svg = renderArchitectureSvg(architecture);
  const width = readSvgDimension(svg, "width");
  const height = readSvgDimension(svg, "height");
  const scale = options.scale ?? 2;
  const background = options.background ?? "#ffffff";
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Canvas rendering is unavailable for PNG export.");
    }
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasToPngBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
