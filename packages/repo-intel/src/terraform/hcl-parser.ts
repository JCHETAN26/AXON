/**
 * Syntax-aware static HCL2 Parser for Terraform files.
 * Does NOT evaluate expressions or execute code.
 * Strips secret values while preserving attribute names and architecture references.
 */

export interface HclAttribute {
  name: string;
  rawValue: string;
  isUnresolved: boolean;
  references: HclReference[];
  startLine: number;
  endLine: number;
}

export interface HclReference {
  targetType: "resource" | "module" | "variable" | "local" | "data" | "count" | "each";
  targetName: string;
  attributeName?: string;
  raw: string;
}

export interface HclBlock {
  blockType: "terraform" | "provider" | "resource" | "data" | "module" | "variable" | "locals" | "output" | "unknown";
  labels: string[];
  attributes: Map<string, HclAttribute>;
  childBlocks: HclBlock[];
  startLine: number;
  endLine: number;
}

export interface HclParseResult {
  filePath: string;
  success: boolean;
  blocks: HclBlock[];
  errors: { code: string; message: string; line?: number }[];
}

const SENSITIVE_ATTR_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /private_key/i,
  /auth_key/i,
  /api_key/i,
  /credentials/i,
  /connection_string/i,
];

/**
 * Strips sensitive strings and secret values from HCL attribute representations.
 */
export function sanitizeHclValue(attrName: string, valueStr: string): string {
  for (const pattern of SENSITIVE_ATTR_PATTERNS) {
    if (pattern.test(attrName)) {
      return "[REDACTED_SECRET_VALUE]";
    }
  }
  return valueStr;
}

/**
 * Extracts static references from an HCL attribute value string.
 * Examples: `aws_vpc.main.id` -> resource: aws_vpc.main, `module.network.subnet_ids` -> module: network
 */
export function extractHclReferences(expr: string): HclReference[] {
  const refs: HclReference[] = [];
  
  // Resource references: aws_subnet.public.id or module.vpc.subnet_ids
  const resourceRefRegex = /\b([a-z0-9_]+)\.([a-z0-9_]+)(?:\.([a-z0-9_]+))?\b/gi;
  let match: RegExpExecArray | null;

  while ((match = resourceRefRegex.exec(expr)) !== null) {
    const p1 = match[1];
    const p2 = match[2];
    const p3 = match[3];

    if (!p1 || !p2) continue;

    if (p1 === "var") {
      refs.push({ targetType: "variable", targetName: p2, raw: match[0] });
    } else if (p1 === "local") {
      refs.push({ targetType: "local", targetName: p2, raw: match[0] });
    } else if (p1 === "module") {
      refs.push({ targetType: "module", targetName: p2, ...(p3 ? { attributeName: p3 } : {}), raw: match[0] });
    } else if (p1 === "data") {
      refs.push({ targetType: "data", targetName: `${p2}.${p3 ?? ""}`, raw: match[0] });
    } else if (p1 === "count") {
      refs.push({ targetType: "count", targetName: p2, raw: match[0] });
    } else if (p1 === "each") {
      refs.push({ targetType: "each", targetName: p2, raw: match[0] });
    } else if (p1.includes("_")) {
      // Terraform resource types typically contain an underscore (e.g. aws_vpc, google_compute_network)
      refs.push({ targetType: "resource", targetName: `${p1}.${p2}`, ...(p3 ? { attributeName: p3 } : {}), raw: match[0] });
    }
  }

  return refs;
}

/**
 * Statically parses HCL content into structured HCL blocks.
 */
export function parseHcl(filePath: string, text: string): HclParseResult {
  const result: HclParseResult = {
    filePath,
    success: true,
    blocks: [],
    errors: [],
  };

  if (!text || text.trim() === "") {
    return result;
  }

  try {
    const lines = text.split(/\r?\n/);
    let currentBlock: HclBlock | null = null;
    const blockStack: HclBlock[] = [];
    let bracketDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      if (rawLine === undefined) continue;
      const line = rawLine.trim();

      if (line === "" || line.startsWith("#") || line.startsWith("//")) {
        continue;
      }

      // Check for block header: type [labels...] {
      const blockHeaderMatch = /^([a-z0-9_]+)(?:\s+"([^"]+)")?(?:\s+"([^"]+)")?\s*\{/i.exec(line);
      
      if (blockHeaderMatch) {
        bracketDepth++;
        const rawType = (blockHeaderMatch[1] ?? "").toLowerCase();
        const label1 = blockHeaderMatch[2];
        const label2 = blockHeaderMatch[3];
        const labels: string[] = [];
        if (label1) labels.push(label1);
        if (label2) labels.push(label2);

        let blockType: HclBlock["blockType"] = "unknown";
        if (rawType === "terraform") blockType = "terraform";
        else if (rawType === "provider") blockType = "provider";
        else if (rawType === "resource") blockType = "resource";
        else if (rawType === "data") blockType = "data";
        else if (rawType === "module") blockType = "module";
        else if (rawType === "variable") blockType = "variable";
        else if (rawType === "locals") blockType = "locals";
        else if (rawType === "output") blockType = "output";

        const newBlock: HclBlock = {
          blockType,
          labels,
          attributes: new Map(),
          childBlocks: [],
          startLine: lineNum,
          endLine: lineNum,
        };

        if (currentBlock) {
          currentBlock.childBlocks.push(newBlock);
          blockStack.push(currentBlock);
        } else {
          result.blocks.push(newBlock);
        }
        currentBlock = newBlock;
        continue;
      }

      // Check for block closing brace
      if (line === "}" || line.startsWith("}")) {
        if (bracketDepth > 0) bracketDepth--;
        if (currentBlock) {
          currentBlock.endLine = lineNum;
          currentBlock = blockStack.pop() ?? null;
        }
        continue;
      }

      // Check for attribute assignment: key = value
      const attrMatch = /^([a-z0-9_]+)\s*=\s*(.+)$/i.exec(line);
      if (attrMatch && currentBlock) {
        const attrName = attrMatch[1];
        const rawVal = (attrMatch[2] ?? "").trim();
        if (!attrName) continue;

        const isUnresolved = 
          rawVal.includes("count.index") || 
          rawVal.includes("each.key") || 
          rawVal.includes("each.value") || 
          rawVal.includes("?") || 
          rawVal.startsWith("module.");

        const sanitizedVal = sanitizeHclValue(attrName, rawVal);
        const references = extractHclReferences(rawVal);

        currentBlock.attributes.set(attrName, {
          name: attrName,
          rawValue: sanitizedVal,
          isUnresolved,
          references,
          startLine: lineNum,
          endLine: lineNum,
        });
      }
    }
  } catch (err: unknown) {
    result.success = false;
    const msg = err instanceof Error ? err.message : "Parse error";
    result.errors.push({
      code: "HCL_PARSE_ERROR",
      message: msg,
    });
  }

  return result;
}
