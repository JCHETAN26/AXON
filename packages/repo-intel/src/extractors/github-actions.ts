import { parse as parseYaml } from "yaml";

import { type RawEvidence } from "../schemas";

/**
 * Parses a GitHub Actions workflow YAML.
 */
export function extractGithubActions(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  let doc: unknown;
  try {
    doc = parseYaml(text);
  } catch {
    return [];
  }

  if (typeof doc !== "object" || doc === null) return [];
  const record = doc as Record<string, unknown>;
  const jobs = record.jobs;

  if (typeof jobs === "object" && jobs !== null) {
    for (const [jobId, jobDef] of Object.entries(jobs)) {
      if (typeof jobDef !== "object" || jobDef === null) continue;
      
      const jobRecord = jobDef as Record<string, unknown>;
      
      // Look for deployment environments
      if (typeof jobRecord.environment === "string" || typeof jobRecord.environment === "object") {
        const envName = typeof jobRecord.environment === "string" 
          ? jobRecord.environment 
          : (jobRecord.environment as Record<string, unknown>).name;
          
        if (typeof envName === "string") {
          out.push({
            filePath,
            evidenceType: "ci-deploy-target",
            extractor: "github-actions",
            excerpt: `environment: ${envName}`,
            fact: { name: envName, category: "environment", detail: jobId },
            confidence: "high",
          });
        }
      }

      // Look at steps
      const steps = jobRecord.steps;
      if (Array.isArray(steps)) {
        for (const step of steps) {
          if (typeof step !== "object" || step === null) continue;
          
          // Check for uses
          if (typeof step.uses === "string") {
            const uses = step.uses;
            
            // AWS auth
            if (uses.startsWith("aws-actions/configure-aws-credentials")) {
              out.push({
                filePath,
                evidenceType: "ci-step",
                extractor: "github-actions",
                excerpt: `uses: ${uses}`,
                fact: { name: "AWS Credentials", technology: "AWS", category: "cloud" },
                confidence: "confirmed",
              });
            }
            
            // GCP auth
            if (uses.startsWith("google-github-actions/auth")) {
              out.push({
                filePath,
                evidenceType: "ci-step",
                extractor: "github-actions",
                excerpt: `uses: ${uses}`,
                fact: { name: "Google Cloud Auth", technology: "Google Cloud", category: "cloud" },
                confidence: "confirmed",
              });
            }

            // Azure login
            if (uses.startsWith("azure/login")) {
              out.push({
                filePath,
                evidenceType: "ci-step",
                extractor: "github-actions",
                excerpt: `uses: ${uses}`,
                fact: { name: "Azure Login", technology: "Azure", category: "cloud" },
                confidence: "confirmed",
              });
            }
          }
        }
      }
    }
  }

  // Scan for secrets in the raw text without parsing to catch all instances
  const secretRegex = /\${{\s*secrets\.([A-Za-z0-9_]+)\s*}}/g;
  let match;
  const foundSecrets = new Set<string>();
  
  while ((match = secretRegex.exec(text)) !== null) {
    const secretName = match[1];
    if (secretName && !foundSecrets.has(secretName)) {
      foundSecrets.add(secretName);
      
      let tech = undefined;
      // Infer technology from secret names like AWS_ACCESS_KEY_ID
      if (secretName.startsWith("AWS_")) tech = { technology: "AWS", category: "cloud" };
      if (secretName.startsWith("GCP_") || secretName.startsWith("GOOGLE_")) tech = { technology: "Google Cloud", category: "cloud" };
      if (secretName.startsWith("STRIPE_")) tech = { technology: "Stripe", category: "payment" };
      
      out.push({
        filePath,
        evidenceType: "secret-reference",
        extractor: "github-actions",
        excerpt: `\${{ secrets.${secretName} }}`,
        fact: { 
          name: secretName, 
          technology: tech?.technology, 
          category: tech?.category ?? "secret" 
        },
        confidence: tech ? "high" : "low",
      });
    }
  }

  return out;
}
