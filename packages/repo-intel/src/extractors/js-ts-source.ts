import { type RawEvidence } from "../schemas";

/**
 * Extracts evidence from JS/TS source files.
 * Uses bounded regexes to find client initializations or explicit framework usage.
 */
export function extractJsTsSource(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (line === undefined || line === "" || line.startsWith("//")) continue;

    // Detect express/fastify/koa initialization
    if (line.includes("express()") || line.includes("Fastify(") || line.includes("koa()")) {
      let framework = undefined;
      if (line.includes("express()")) framework = "Express";
      if (line.includes("Fastify(")) framework = "Fastify";
      if (line.includes("koa()")) framework = "Koa";

      out.push({
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        evidenceType: "client-initialization",
        extractor: "js-ts-source",
        excerpt: line.substring(0, 100),
        fact: { name: framework, technology: framework, category: "service" },
        confidence: "high",
      });
    }

    // Detect HTTP clients
    if (line.includes("axios.get") || line.includes("axios.post") || line.includes("fetch(") || line.includes("got(")) {
      out.push({
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        evidenceType: "http-client",
        extractor: "js-ts-source",
        excerpt: line.substring(0, 100),
        fact: { name: "HTTP client", category: "http-client" },
        confidence: "medium",
      });
    }

    // Detect database clients
    if (line.includes("new PrismaClient(") || line.includes("mongoose.connect(") || line.includes("drizzle(") || line.includes("new Sequelize(")) {
      let db = undefined;
      if (line.includes("new PrismaClient(")) db = "Prisma";
      if (line.includes("mongoose.connect(")) db = "MongoDB";
      if (line.includes("drizzle(")) db = "Drizzle ORM";
      if (line.includes("new Sequelize(")) db = "SQLAlchemy"; // close enough

      out.push({
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        evidenceType: "client-initialization",
        extractor: "js-ts-source",
        excerpt: line.substring(0, 100),
        fact: { name: db, technology: db, category: "database" },
        confidence: "high",
      });
    }

    // Server route registration
    if (/(?:app|router|server)\.(?:get|post|put|delete|patch|all)\(['"`]\//.test(line)) {
      out.push({
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        evidenceType: "http-route",
        extractor: "js-ts-source",
        excerpt: line.substring(0, 100),
        fact: { name: "HTTP Route", category: "api" },
        confidence: "medium",
      });
    }
  }

  return out;
}
