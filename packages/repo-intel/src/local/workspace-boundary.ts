import { resolve, relative, normalize } from "node:path";
import { realpathSync, lstatSync, readFileSync, existsSync } from "node:fs";
import { readdir, stat, realpath } from "node:fs/promises";

/**
 * Default directories and file patterns that must always be excluded from
 * local workspace analysis regardless of user configuration.
 */
export const ALWAYS_EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm",
  "vendor",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "__pycache__",
  ".terraform",
  ".terragrunt-cache",
  "coverage",
  ".cache",
  ".turbo",
]);

/**
 * File patterns that must always be excluded because they may contain secrets
 * or sensitive infrastructure state.
 */
export const ALWAYS_EXCLUDED_FILES = new Set([
  "terraform.tfstate",
  "terraform.tfstate.backup",
  "kubeconfig",
  ".kubeconfig",
]);

/** File extensions for secret/key material. */
export const SECRET_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".keystore",
  ".jks",
  ".cert",
]);

/** Environment-value files whose values must never be retained. */
export const ENV_FILE_PATTERNS = [/^\.env$/, /^\.env\..+$/, /^\.envrc$/];

/** Credential directories that must always be excluded. */
export const CREDENTIAL_DIRS = new Set([
  ".aws",
  ".azure",
  ".gcloud",
  ".kube",
  ".ssh",
  ".gnupg",
  ".docker",
]);

export interface WorkspaceBoundaryLimits {
  /** Maximum number of files to inventory (default 10_000). */
  maxFileCount: number;
  /** Maximum individual file size in bytes (default 5 MB). */
  maxFileSizeBytes: number;
  /** Maximum aggregate bytes across all files (default 500 MB). */
  maxAggregateSizeBytes: number;
  /** Maximum parser nesting depth (default 20). */
  maxNestingDepth: number;
  /** Maximum evidence records per analysis run (default 50_000). */
  maxEvidenceCount: number;
  /** Analysis timeout in milliseconds (default 120_000 = 2 min). */
  analysisTimeoutMs: number;
}

export const DEFAULT_LIMITS: WorkspaceBoundaryLimits = {
  maxFileCount: 10_000,
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxAggregateSizeBytes: 500 * 1024 * 1024,
  maxNestingDepth: 20,
  maxEvidenceCount: 50_000,
  analysisTimeoutMs: 120_000,
};

export interface WorkspaceBoundaryConfig {
  /** The approved root directory (absolute path). */
  rootDir: string;
  /** User-configurable exclusion patterns (glob-style basenames). */
  userExclusions?: string[];
  /** Override default limits. */
  limits?: Partial<WorkspaceBoundaryLimits>;
  /** Whether .gitignore should be respected (default true). */
  respectGitignore?: boolean;
  /** Whether .dockerignore should be respected (default true). */
  respectDockerignore?: boolean;
  /** Whether .axonignore should be respected (default true). */
  respectAxonignore?: boolean;
}

export interface InventoriedFile {
  /** Path relative to workspace root. */
  relativePath: string;
  /** Absolute path. */
  absolutePath: string;
  /** File size in bytes. */
  sizeBytes: number;
}

export interface WorkspaceInventory {
  rootDir: string;
  files: InventoriedFile[];
  fileCount: number;
  totalBytes: number;
  skippedCount: number;
  skippedReasons: string[];
  limitReached: boolean;
}

/**
 * Enforces a secure local workspace boundary for analysis.
 *
 * Prevents path traversal, symlink escapes, secret leakage, and resource
 * exhaustion during local repository analysis.
 */
export class WorkspaceBoundary {
  readonly rootDir: string;
  readonly limits: WorkspaceBoundaryLimits;
  private readonly approvedRootDir: string;
  private readonly userExclusions: Set<string>;
  private readonly ignorePatterns: string[];

  constructor(config: WorkspaceBoundaryConfig) {
    const resolved = resolve(config.rootDir);
    if (!existsSync(resolved)) {
      throw new Error(`Workspace root does not exist: ${resolved}`);
    }
    const stats = lstatSync(resolved);
    if (!stats.isDirectory()) {
      throw new Error(`Workspace root is not a directory: ${resolved}`);
    }
    // Resolve symlinks to get canonical path for boundary checks
    this.approvedRootDir = resolved;
    this.rootDir = realpathSync(resolved);
    this.limits = { ...DEFAULT_LIMITS, ...config.limits };
    this.userExclusions = new Set(config.userExclusions ?? []);
    this.ignorePatterns = [];

    // Load ignore files
    if (config.respectGitignore !== false) {
      this.loadIgnoreFile(resolve(this.rootDir, ".gitignore"));
    }
    if (config.respectDockerignore !== false) {
      this.loadIgnoreFile(resolve(this.rootDir, ".dockerignore"));
    }
    if (config.respectAxonignore !== false) {
      this.loadIgnoreFile(resolve(this.rootDir, ".axonignore"));
    }
  }

  /**
   * Validate that an absolute path is within the workspace root.
   * Returns the canonical path if valid, throws if traversal detected.
   */
  validatePath(filePath: string): string {
    const resolved = resolve(filePath);
    const withinApprovedRoot = this.isWithinRoot(resolved, this.approvedRootDir);
    const withinCanonicalRoot = this.isWithinRoot(resolved, this.rootDir);

    // Check the lexical path is within the approved root spelling. On macOS,
    // tmp paths may be presented as /var while their realpath is /private/var.
    // Symlink targets are checked separately by validateRealPath.
    if (!withinApprovedRoot && !withinCanonicalRoot) {
      throw new PathTraversalError(
        `Path traversal detected: ${filePath} resolves outside workspace root`,
      );
    }

    return resolved;
  }

  /**
   * Check whether a real path (after symlink resolution) remains within root.
   * Prevents symlink escape attacks.
   */
  async validateRealPath(filePath: string): Promise<string> {
    const resolved = this.validatePath(filePath);

    try {
      const real = await realpath(resolved);

      if (!this.isWithinRoot(real, this.rootDir)) {
        throw new SymlinkEscapeError(
          `Symlink escape detected: ${filePath} resolves to ${real} outside workspace root`,
        );
      }
      return real;
    } catch (err) {
      if (err instanceof SymlinkEscapeError) throw err;
      // File may not exist; that's fine for validation
      return resolved;
    }
  }

  /**
   * Check whether a basename or relative path should be excluded.
   */
  isExcluded(relativePath: string): { excluded: boolean; reason?: string } {
    const parts = relativePath.split("/").filter(Boolean);

    // Check each directory segment
    for (const part of parts.slice(0, -1)) {
      if (ALWAYS_EXCLUDED_DIRS.has(part)) {
        return { excluded: true, reason: `directory-excluded:${part}` };
      }
      if (CREDENTIAL_DIRS.has(part)) {
        return { excluded: true, reason: `credential-dir:${part}` };
      }
      if (this.userExclusions.has(part)) {
        return { excluded: true, reason: `user-excluded:${part}` };
      }
    }

    // Check filename
    const filename = parts[parts.length - 1];
    if (!filename) return { excluded: false };

    if (ALWAYS_EXCLUDED_FILES.has(filename)) {
      return { excluded: true, reason: `secret-file:${filename}` };
    }

    // Check extension for secret material
    for (const ext of SECRET_EXTENSIONS) {
      if (filename.endsWith(ext)) {
        return { excluded: true, reason: `secret-extension:${ext}` };
      }
    }

    // Check ignore patterns
    for (const pattern of this.ignorePatterns) {
      if (this.matchesIgnorePattern(relativePath, pattern)) {
        return { excluded: true, reason: `ignore-pattern:${pattern}` };
      }
    }

    // Check user exclusions on filename
    if (this.userExclusions.has(filename)) {
      return { excluded: true, reason: `user-excluded:${filename}` };
    }

    return { excluded: false };
  }

  /**
   * Check if a file is an environment-value file whose values must be scrubbed.
   */
  isEnvFile(filename: string): boolean {
    return ENV_FILE_PATTERNS.some((pat) => pat.test(filename));
  }

  /**
   * Scrub environment variable values from .env file content.
   * Retains variable names but replaces values with "[REDACTED]".
   */
  scrubEnvValues(content: string): string {
    return content
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) return line;
        const key = trimmed.slice(0, eqIdx);
        return `${key}=[REDACTED]`;
      })
      .join("\n");
  }

  /**
   * Inventory all supported files within the workspace boundary.
   */
  async inventory(): Promise<WorkspaceInventory> {
    const files: InventoriedFile[] = [];
    let totalBytes = 0;
    let skippedCount = 0;
    const skippedReasons: string[] = [];
    let limitReached = false;

    const walk = async (dir: string, depth: number) => {
      if (depth > this.limits.maxNestingDepth) {
        skippedCount++;
        skippedReasons.push(`max-nesting-depth:${dir}`);
        return;
      }

      if (limitReached) return;

      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        skippedCount++;
        skippedReasons.push(`unreadable:${dir}`);
        return;
      }

      for (const entry of entries) {
        if (limitReached) break;

        const fullPath = resolve(dir, entry.name);
        const relPath = relative(this.rootDir, fullPath);

        if (entry.isSymbolicLink()) {
          // Check symlink doesn't escape root
          try {
            await this.validateRealPath(fullPath);
          } catch {
            skippedCount++;
            skippedReasons.push(`symlink-escape:${relPath}`);
            continue;
          }
        }

        if (entry.isDirectory()) {
          const exc = this.isExcluded(relPath + "/");
          if (exc.excluded) {
            skippedCount++;
            if (exc.reason) skippedReasons.push(exc.reason);
            continue;
          }
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const exc = this.isExcluded(relPath);
          if (exc.excluded) {
            skippedCount++;
            if (exc.reason) skippedReasons.push(exc.reason);
            continue;
          }

          let fileStats;
          try {
            fileStats = await stat(fullPath);
          } catch {
            skippedCount++;
            skippedReasons.push(`unreadable:${relPath}`);
            continue;
          }

          if (fileStats.size > this.limits.maxFileSizeBytes) {
            skippedCount++;
            skippedReasons.push(`file-too-large:${relPath}`);
            continue;
          }

          if (totalBytes + fileStats.size > this.limits.maxAggregateSizeBytes) {
            limitReached = true;
            skippedReasons.push("aggregate-limit-reached");
            break;
          }

          if (files.length >= this.limits.maxFileCount) {
            limitReached = true;
            skippedReasons.push("file-count-limit-reached");
            break;
          }

          files.push({
            relativePath: relPath,
            absolutePath: fullPath,
            sizeBytes: fileStats.size,
          });
          totalBytes += fileStats.size;
        }
      }
    };

    await walk(this.rootDir, 0);

    return {
      rootDir: this.rootDir,
      files,
      fileCount: files.length,
      totalBytes,
      skippedCount,
      skippedReasons: [...new Set(skippedReasons)],
      limitReached,
    };
  }

  private loadIgnoreFile(filePath: string) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
      this.ignorePatterns.push(...lines);
    } catch {
      // File doesn't exist or unreadable — that's fine
    }
  }

  private matchesIgnorePattern(relativePath: string, pattern: string): boolean {
    // Simple glob matching: support * and directory patterns
    const normalizedPattern = normalize(pattern).replace(/\\/g, "/");
    const normalizedPath = relativePath.replace(/\\/g, "/");

    // Exact match
    if (normalizedPath === normalizedPattern) return true;

    // Directory pattern (ends with /)
    if (normalizedPattern.endsWith("/")) {
      const dir = normalizedPattern.slice(0, -1);
      if (normalizedPath.startsWith(dir + "/") || normalizedPath === dir) {
        return true;
      }
    }

    // Basename match (pattern without /)
    if (!normalizedPattern.includes("/")) {
      const parts = normalizedPath.split("/");
      const basename = parts[parts.length - 1];
      if (!basename) return false;

      // Wildcard support (e.g., *.log)
      if (normalizedPattern.includes("*")) {
        const regex = new RegExp(
          "^" + normalizedPattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
        );
        return regex.test(basename);
      }

      return basename === normalizedPattern;
    }

    return false;
  }

  private isWithinRoot(candidatePath: string, rootPath: string): boolean {
    const normalizedRoot = rootPath.endsWith("/") ? rootPath : rootPath + "/";
    return candidatePath === rootPath || candidatePath.startsWith(normalizedRoot);
  }
}

export class PathTraversalError extends Error {
  readonly code = "PATH_TRAVERSAL";
  constructor(message: string) {
    super(message);
    this.name = "PathTraversalError";
  }
}

export class SymlinkEscapeError extends Error {
  readonly code = "SYMLINK_ESCAPE";
  constructor(message: string) {
    super(message);
    this.name = "SymlinkEscapeError";
  }
}
