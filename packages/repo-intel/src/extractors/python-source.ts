import { type RawEvidence } from "../schemas";

/**
 * Extracts evidence from Python source files.
 */
export function extractPythonSource(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (line === undefined || line === "" || line.startsWith("#")) continue;

    // Django/Flask/FastAPI
    if (line.includes("Flask(__name__)") || line.includes("FastAPI()") || line.includes("django.")) {
      let fw = undefined;
      if (line.includes("Flask")) fw = "Flask";
      if (line.includes("FastAPI")) fw = "FastAPI";
      if (line.includes("django.")) fw = "Django";

      out.push({
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        evidenceType: "client-initialization",
        extractor: "python-source",
        excerpt: line.substring(0, 100),
        fact: { name: fw, technology: fw, category: "service" },
        confidence: "high",
      });
    }

    // Route definition in flask/fastAPI
    if (line.startsWith("@app.route(") || line.startsWith("@app.get(") || line.startsWith("@app.post(")) {
      out.push({
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        evidenceType: "http-route",
        extractor: "python-source",
        excerpt: line.substring(0, 100),
        fact: { name: "HTTP Route", category: "api" },
        confidence: "medium",
      });
    }
  }
  return out;
}
