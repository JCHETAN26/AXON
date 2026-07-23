import { parse as parseYaml } from "yaml";

import { type RawEvidence } from "../schemas";
import { lookupTech } from "../tech-catalog";

/**
 * Parses a Dockerfile and looks for FROM instructions.
 */
export function extractDockerfile(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (line === undefined || line === "" || line.startsWith("#")) continue;

    const match = /^FROM\s+([^\s:]+)/i.exec(line);
    const image = match?.[1];
    if (image) {
      const baseImage = image.split(":")[0];
      if (!baseImage) continue;
      // Map base images to technology if possible, e.g. "postgres", "redis", "node", "python".
      const tech = lookupTech(baseImage);
      if (tech) {
        out.push({
          filePath,
          startLine: i + 1,
          endLine: i + 1,
          evidenceType: "container-image",
          extractor: "dockerfile",
          excerpt: line.substring(0, 50),
          fact: { name: image, technology: tech.technology, category: tech.category },
          confidence: "high", // Base images are strong indicators
        });
      }
    }
  }
  return out;
}

/**
 * Parses Docker Compose YAML and looks for services and their images.
 */
export function extractCompose(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  let doc: unknown;
  try {
    doc = parseYaml(text);
  } catch {
    return [];
  }

  if (typeof doc !== "object" || doc === null) return [];
  const record = doc as Record<string, unknown>;
  const services = record.services;

  if (typeof services === "object" && services !== null) {
    for (const [serviceName, serviceDef] of Object.entries(services)) {
      if (typeof serviceDef !== "object" || serviceDef === null) continue;
      
      const defRecord = serviceDef as Record<string, unknown>;
      const imageStr = typeof defRecord.image === "string" ? defRecord.image : undefined;
      
      // We can use the service name or the image name to infer technology.
      let tech = lookupTech(serviceName);
      let nameUsed = serviceName;
      
      if (!tech && imageStr) {
        const baseImage = imageStr.split(":")[0];
        if (baseImage) {
          tech = lookupTech(baseImage);
          nameUsed = baseImage;
        }
      }

      if (tech) {
        out.push({
          filePath,
          evidenceType: "container-service",
          extractor: "compose",
          excerpt: `service: ${serviceName}${imageStr ? ` image: ${imageStr}` : ""}`,
          fact: { name: nameUsed, technology: tech.technology, category: tech.category, detail: serviceName },
          confidence: "confirmed", // A Compose service explicitly deploying it is confirmed evidence
        });
      } else {
        // Even if we don't know the exact technology, a compose service is a component
        out.push({
          filePath,
          evidenceType: "container-service",
          extractor: "compose",
          excerpt: `service: ${serviceName}`,
          fact: { name: serviceName, category: "service", detail: serviceName },
          confidence: "high",
        });
      }
    }
  }

  return out;
}
