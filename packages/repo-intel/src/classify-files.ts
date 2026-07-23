/**
 * Decides whether a repository file is supported by a deterministic extractor,
 * or should be skipped. Skipping is safe by default: anything not explicitly
 * supported is ignored. Binary/media/generated/vendor/lockfile paths are never
 * fetched.
 */

export type ExtractorId =
  | "package-json"
  | "requirements-txt"
  | "pyproject-toml"
  | "go-mod"
  | "dockerfile"
  | "compose"
  | "github-actions"
  | "config-env"
  | "js-ts-source"
  | "python-source"
  | "terraform"
  | "kubernetes";

export type SkipReason =
  | "unsupported"
  | "vendored"
  | "generated"
  | "minified"
  | "source-map"
  | "binary"
  | "lockfile"
  | "path-too-long";

export type FileClass =
  | { readonly supported: true; readonly extractor: ExtractorId }
  | { readonly supported: false; readonly reason: SkipReason };

const SKIP_DIR_SEGMENTS = new Set([
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".output",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  "bin",
  "obj",
  ".git",
  ".cache",
  "generated",
  "__generated__",
  ".gradle",
]);

const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "pdf", "zip", "gz",
  "tgz", "tar", "bz2", "7z", "rar", "mp3", "mp4", "mov", "avi", "webm", "woff",
  "woff2", "ttf", "otf", "eot", "wasm", "class", "jar", "so", "dylib", "dll",
  "exe", "bin", "o", "a", "pyc", "pdf", "parquet", "db", "sqlite",
]);

const LOCKFILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "npm-shrinkwrap.json",
  "poetry.lock",
  "Pipfile.lock",
  "Cargo.lock",
  "go.sum",
  "composer.lock",
  "Gemfile.lock",
]);

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

function extension(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/** Classifies a repository file path (size checks happen separately). */
export function classifyFile(path: string, maxPathLength = 400): FileClass {
  if (path.length > maxPathLength) return { supported: false, reason: "path-too-long" };

  const segments = path.split("/");
  for (const segment of segments.slice(0, -1)) {
    if (SKIP_DIR_SEGMENTS.has(segment)) return { supported: false, reason: "vendored" };
  }

  const name = basename(path);
  const lower = name.toLowerCase();

  if (LOCKFILES.has(name)) return { supported: false, reason: "lockfile" };
  if (lower.endsWith(".map")) return { supported: false, reason: "source-map" };
  if (lower.endsWith(".min.js") || lower.endsWith(".min.css")) {
    return { supported: false, reason: "minified" };
  }
  if (BINARY_EXT.has(extension(name))) return { supported: false, reason: "binary" };

  // Exact-name manifests and container files.
  if (name === "package.json") return { supported: true, extractor: "package-json" };
  if (name === "requirements.txt") return { supported: true, extractor: "requirements-txt" };
  if (name === "pyproject.toml") return { supported: true, extractor: "pyproject-toml" };
  if (name === "go.mod") return { supported: true, extractor: "go-mod" };
  if (name === "Dockerfile" || lower.startsWith("dockerfile.")) {
    return { supported: true, extractor: "dockerfile" };
  }
  if (
    name === "compose.yml" ||
    name === "compose.yaml" ||
    name === "docker-compose.yml" ||
    name === "docker-compose.yaml"
  ) {
    return { supported: true, extractor: "compose" };
  }

  // GitHub Actions workflows.
  if (
    path.startsWith(".github/workflows/") &&
    (lower.endsWith(".yml") || lower.endsWith(".yaml"))
  ) {
    return { supported: true, extractor: "github-actions" };
  }

  // Environment name files (names only — values are never stored).
  if (name === ".env" || lower.startsWith(".env.")) {
    return { supported: true, extractor: "config-env" };
  }

  const ext = extension(name);

  // Terraform
  if (ext === "tf") return { supported: true, extractor: "terraform" };

  // Kubernetes and general YAML
  if (ext === "yaml" || ext === "yml") return { supported: true, extractor: "kubernetes" };

  // Source files for syntax-aware detectors.
  if (["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext)) {
    return { supported: true, extractor: "js-ts-source" };
  }
  if (ext === "py") return { supported: true, extractor: "python-source" };

  return { supported: false, reason: "unsupported" };
}
