import { type RawEvidence } from "../schemas";
import { parseHcl } from "../terraform/hcl-parser";
import { lookupTerraformCatalog } from "../terraform/catalog";

/**
 * Extracts evidence from Terraform HCL files using static syntax parsing and catalog lookup.
 */
export function extractTerraform(filePath: string, text: string): RawEvidence[] {
  const evidence: RawEvidence[] = [];

  const parseResult = parseHcl(filePath, text);
  if (!parseResult.success) {
    return evidence;
  }

  for (const block of parseResult.blocks) {
    if (block.blockType === "resource") {
      const type = block.labels[0];
      const name = block.labels[1];

      if (type && name) {
        const catalogEntry = lookupTerraformCatalog(type);

        evidence.push({
          filePath,
          startLine: block.startLine,
          endLine: block.endLine,
          evidenceType: "infrastructure-declaration",
          extractor: "terraform",
          excerpt: `resource "${type}" "${name}"`,
          fact: {
            category: catalogEntry.category,
            provider: catalogEntry.provider,
            technology: catalogEntry.technology,
            name,
          },
          confidence: catalogEntry.supportLevel === "supported" ? "high" : "medium",
        });
      }
    }
  }

  return evidence;
}
