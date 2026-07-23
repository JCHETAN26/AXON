import { type RawEvidence } from "../schemas";

/**
 * Parses .env files and extracts configuration variable names.
 * NEVER extracts values.
 */
export function extractConfigEnv(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (line === undefined || line === "" || line.startsWith("#")) continue;

    const match = /^([A-Za-z0-9_]+)=/.exec(line);
    const varName = match?.[1];
    
    if (varName) {
      let tech = undefined;
      
      // Common environment variable names
      if (varName.includes("DATABASE_URL") || varName.includes("POSTGRES_")) {
        tech = { technology: "PostgreSQL", category: "database" };
      } else if (varName.includes("MYSQL_")) {
        tech = { technology: "MySQL", category: "database" };
      } else if (varName.includes("REDIS_")) {
        tech = { technology: "Redis", category: "cache" };
      } else if (varName.includes("KAFKA_")) {
        tech = { technology: "Kafka", category: "queue" };
      } else if (varName.startsWith("AWS_")) {
        tech = { technology: "AWS", category: "cloud" };
      } else if (varName.startsWith("GOOGLE_") || varName.startsWith("GCP_")) {
        tech = { technology: "Google Cloud", category: "cloud" };
      } else if (varName.includes("STRIPE_")) {
        tech = { technology: "Stripe", category: "payment" };
      } else if (varName.includes("ANTHROPIC_")) {
        tech = { technology: "Anthropic", category: "ai-provider" };
      } else if (varName.includes("OPENAI_")) {
        tech = { technology: "OpenAI", category: "ai-provider" };
      }

      out.push({
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        evidenceType: "config-env-name",
        extractor: "config-env",
        excerpt: varName,
        fact: { 
          name: varName, 
          technology: tech?.technology, 
          category: tech?.category ?? "config" 
        },
        confidence: tech ? "medium" : "low",
      });
    }
  }
  return out;
}
