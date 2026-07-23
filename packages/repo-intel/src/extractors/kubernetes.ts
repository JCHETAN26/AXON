import { type RawEvidence } from "../schemas";
import { parseAllDocuments, isMap } from "yaml";

export function extractKubernetes(filePath: string, text: string): RawEvidence[] {
  const evidence: RawEvidence[] = [];
  
  try {
    const docs = parseAllDocuments(text);
    
    for (const doc of docs) {
      if (!doc || !doc.contents || !isMap(doc.contents)) continue;
      
      const apiVersion = doc.get("apiVersion");
      const kind = doc.get("kind");
      
      if (typeof apiVersion !== "string" || typeof kind !== "string") {
        continue;
      }
      
      const metadata = doc.get("metadata");
      const rawName = isMap(metadata) ? metadata.get("name") : undefined;
      const name = typeof rawName === "string" ? rawName : "unknown";
      
      let category = "";
      if (kind === "Deployment" || kind === "Pod" || kind === "StatefulSet" || kind === "DaemonSet") {
        category = "compute";
      } else if (kind === "Service") {
        category = "network";
      } else if (kind === "Ingress") {
        category = "load-balancer";
      } else if (kind === "CronJob" || kind === "Job") {
        category = "job";
      } else if (kind === "PersistentVolumeClaim") {
        category = "storage";
      }

      if (category) {
        evidence.push({
          filePath,
          startLine: 1, // Full file parsing doesn't easily give exact line without custom AST traversal
          evidenceType: "infrastructure-declaration",
          extractor: "kubernetes",
          excerpt: `kind: ${kind}\nmetadata:\n  name: ${name}`,
          fact: { category, name, technology: kind },
          confidence: "high"
        });
      }
    }
  } catch {
    // If it's not valid YAML, we just return empty array
  }

  return evidence;
}
