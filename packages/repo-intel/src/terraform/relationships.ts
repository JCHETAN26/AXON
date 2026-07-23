import { type HclBlock } from "./hcl-parser";
import { type RawEvidence } from "../schemas";

export interface IaCRelationshipEvidence {
  sourceResourceType: string;
  sourceResourceName: string;
  targetResourceType: string;
  targetResourceName: string;
  relationshipType: "attachment" | "event-trigger" | "data-flow" | "dependency" | "network-binding";
  producingAttribute: string;
  filePath: string;
  startLine: number;
  confidence: "high" | "medium";
}

/**
 * Statically extracts infrastructure relationships between Terraform HCL resources.
 */
export function extractTerraformRelationships(
  filePath: string,
  blocks: HclBlock[]
): IaCRelationshipEvidence[] {
  const relationships: IaCRelationshipEvidence[] = [];

  for (const block of blocks) {
    if (block.blockType !== "resource") continue;

    const sourceResourceType = block.labels[0];
    const sourceResourceName = block.labels[1];

    if (!sourceResourceType || !sourceResourceName) continue;

    for (const [attrName, attr] of block.attributes.entries()) {
      for (const ref of attr.references) {
        if (ref.targetType === "resource") {
          const [targetResourceType, targetResourceName] = ref.targetName.split(".");
          if (targetResourceType && targetResourceName) {
            let relationshipType: IaCRelationshipEvidence["relationshipType"] = "dependency";

            if (attrName === "vpc_id" || attrName === "subnet_id" || attrName.includes("subnet")) {
              relationshipType = "network-binding";
            } else if (attrName.includes("target_group") || attrName.includes("security_group")) {
              relationshipType = "attachment";
            } else if (attrName.includes("event_source") || attrName.includes("topic")) {
              relationshipType = "event-trigger";
            }

            relationships.push({
              sourceResourceType,
              sourceResourceName,
              targetResourceType,
              targetResourceName,
              relationshipType,
              producingAttribute: attrName,
              filePath,
              startLine: attr.startLine,
              confidence: "high",
            });
          }
        }
      }
    }
  }

  return relationships;
}

/**
 * Converts HCL parsed blocks into RawEvidence items for the repo intelligence engine.
 */
export function hclBlocksToRawEvidence(filePath: string, blocks: HclBlock[]): RawEvidence[] {
  const evidenceList: RawEvidence[] = [];

  for (const block of blocks) {
    if (block.blockType === "resource") {
      const type = block.labels[0];
      const name = block.labels[1];
      if (type && name) {
        const provider = type.startsWith("aws_") ? "aws" : type.startsWith("google_") ? "gcp" : "generic";
        evidenceList.push({
          filePath,
          startLine: block.startLine,
          endLine: block.endLine,
          evidenceType: "infrastructure-declaration",
          extractor: "terraform",
          excerpt: `resource "${type}" "${name}"`,
          fact: {
            category: type.includes("db") ? "database" : type.includes("vpc") || type.includes("subnet") ? "network" : "compute",
            provider,
            technology: type,
            name,
          },
          confidence: "high",
        });
      }
    }
  }

  return evidenceList;
}
