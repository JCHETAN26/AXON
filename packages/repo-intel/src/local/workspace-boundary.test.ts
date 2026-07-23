import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdirSync, writeFileSync, symlinkSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  WorkspaceBoundary,
  PathTraversalError,
  SymlinkEscapeError,
  DEFAULT_LIMITS,
} from "./workspace-boundary";

function createTempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "axon-test-"));
  // Create a basic workspace structure
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "terraform"), { recursive: true });
  mkdirSync(join(dir, "k8s"), { recursive: true });
  mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
  mkdirSync(join(dir, ".git", "objects"), { recursive: true });
  mkdirSync(join(dir, ".terraform"), { recursive: true });

  writeFileSync(join(dir, "src", "index.ts"), 'console.log("hello");');
  writeFileSync(join(dir, "src", "app.ts"), 'export const app = {};');
  writeFileSync(join(dir, "terraform", "main.tf"), 'resource "aws_instance" "web" {}');
  writeFileSync(join(dir, "k8s", "deployment.yaml"), "apiVersion: apps/v1");
  writeFileSync(join(dir, "package.json"), '{"name": "test"}');
  writeFileSync(join(dir, ".env"), "SECRET_KEY=supersecret123\nDB_URL=postgres://localhost");
  writeFileSync(join(dir, ".env.production"), "API_KEY=prod-secret");
  writeFileSync(join(dir, "node_modules", "pkg", "index.js"), "module.exports = {}");
  writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/main");
  writeFileSync(join(dir, ".terraform", "terraform.tfstate"), '{"version": 4}');
  writeFileSync(join(dir, "terraform.tfstate"), '{"version": 4}');
  writeFileSync(join(dir, "server.key"), "-----BEGIN PRIVATE KEY-----");
  writeFileSync(join(dir, ".gitignore"), "dist/\n*.log\n");
  writeFileSync(join(dir, ".axonignore"), "tmp/\n*.bak\n");

  return dir;
}

describe("WorkspaceBoundary", () => {
  let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = createTempWorkspace();
  });

  afterEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("resolves and validates workspace root", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.rootDir).toBeTruthy();
      expect(boundary.limits).toMatchObject(DEFAULT_LIMITS);
    });

    it("throws for non-existent root", () => {
      expect(
        () => new WorkspaceBoundary({ rootDir: "/nonexistent/path/xyz" })
      ).toThrow("does not exist");
    });

    it("throws for file root (not directory)", () => {
      const filePath = join(workspaceDir, "package.json");
      expect(() => new WorkspaceBoundary({ rootDir: filePath })).toThrow(
        "not a directory"
      );
    });
  });

  describe("path traversal prevention", () => {
    it("rejects paths outside workspace root", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(() => boundary.validatePath("/etc/passwd")).toThrow(
        PathTraversalError
      );
    });

    it("rejects ../ traversal", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(() =>
        boundary.validatePath(join(workspaceDir, "..", "..", "etc", "passwd"))
      ).toThrow(PathTraversalError);
    });

    it("accepts paths within workspace root", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      const result = boundary.validatePath(join(workspaceDir, "src", "index.ts"));
      expect(result).toContain("src");
    });
  });

  describe("symlink escape prevention", () => {
    it("rejects symlinks pointing outside workspace", async () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      const linkPath = join(workspaceDir, "escape-link");
      try {
        symlinkSync("/etc", linkPath);
      } catch {
        // Skip if symlinks not supported
        return;
      }
      await expect(boundary.validateRealPath(linkPath)).rejects.toThrow(
        SymlinkEscapeError
      );
    });

    it("accepts symlinks within workspace", async () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      const linkPath = join(workspaceDir, "src-link");
      try {
        symlinkSync(join(workspaceDir, "src"), linkPath);
      } catch {
        return;
      }
      const result = await boundary.validateRealPath(linkPath);
      expect(result).toContain("src");
    });
  });

  describe("exclusion rules", () => {
    it("excludes .git directory", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded(".git/HEAD").excluded).toBe(true);
    });

    it("excludes node_modules", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded("node_modules/pkg/index.js").excluded).toBe(true);
    });

    it("excludes .terraform directory", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded(".terraform/plugins/foo").excluded).toBe(true);
    });

    it("excludes terraform state files", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded("terraform.tfstate").excluded).toBe(true);
    });

    it("excludes secret key files", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded("server.key").excluded).toBe(true);
      expect(boundary.isExcluded("cert.pem").excluded).toBe(true);
    });

    it("excludes credential directories", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded(".aws/credentials").excluded).toBe(true);
      expect(boundary.isExcluded(".kube/config").excluded).toBe(true);
    });

    it("respects .gitignore patterns", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded("output.log").excluded).toBe(true);
    });

    it("respects .axonignore patterns", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded("data.bak").excluded).toBe(true);
    });

    it("allows normal source files", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isExcluded("src/index.ts").excluded).toBe(false);
      expect(boundary.isExcluded("terraform/main.tf").excluded).toBe(false);
    });

    it("respects user exclusions", () => {
      const boundary = new WorkspaceBoundary({
        rootDir: workspaceDir,
        userExclusions: ["custom-dir"],
      });
      expect(boundary.isExcluded("custom-dir/file.ts").excluded).toBe(true);
    });
  });

  describe("environment value scrubbing", () => {
    it("identifies env files", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      expect(boundary.isEnvFile(".env")).toBe(true);
      expect(boundary.isEnvFile(".env.production")).toBe(true);
      expect(boundary.isEnvFile(".envrc")).toBe(true);
      expect(boundary.isEnvFile("config.ts")).toBe(false);
    });

    it("scrubs env values but retains names", () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      const content = "SECRET_KEY=supersecret123\nDB_URL=postgres://localhost\n# comment\nEMPTY_KEY=";
      const scrubbed = boundary.scrubEnvValues(content);
      expect(scrubbed).toContain("SECRET_KEY=[REDACTED]");
      expect(scrubbed).toContain("DB_URL=[REDACTED]");
      expect(scrubbed).toContain("# comment");
      expect(scrubbed).not.toContain("supersecret123");
      expect(scrubbed).not.toContain("postgres://localhost");
    });
  });

  describe("inventory", () => {
    it("inventories workspace files excluding secrets and excluded dirs", async () => {
      const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
      const inventory = await boundary.inventory();

      expect(inventory.fileCount).toBeGreaterThan(0);
      expect(inventory.rootDir).toBe(boundary.rootDir);

      // Should include source files
      const relPaths = inventory.files.map((f) => f.relativePath);
      expect(relPaths).toContain("src/index.ts");
      expect(relPaths).toContain("terraform/main.tf");

      // Should NOT include excluded items
      expect(relPaths.every((p) => !p.startsWith("node_modules/"))).toBe(true);
      expect(relPaths.every((p) => !p.startsWith(".git/"))).toBe(true);
      expect(relPaths.every((p) => !p.startsWith(".terraform/"))).toBe(true);
      expect(relPaths.every((p) => !p.endsWith(".key"))).toBe(true);
      expect(relPaths.every((p) => p !== "terraform.tfstate")).toBe(true);
    });

    it("enforces file count limits", async () => {
      const boundary = new WorkspaceBoundary({
        rootDir: workspaceDir,
        limits: { maxFileCount: 2 },
      });
      const inventory = await boundary.inventory();
      expect(inventory.fileCount).toBeLessThanOrEqual(2);
      expect(inventory.limitReached).toBe(true);
    });

    it("enforces file size limits", async () => {
      // Create a large file
      writeFileSync(join(workspaceDir, "big.txt"), "x".repeat(1024));
      const boundary = new WorkspaceBoundary({
        rootDir: workspaceDir,
        limits: { maxFileSizeBytes: 100 },
      });
      const inventory = await boundary.inventory();
      const relPaths = inventory.files.map((f) => f.relativePath);
      expect(relPaths).not.toContain("big.txt");
      expect(inventory.skippedReasons).toContain("file-too-large:big.txt");
    });
  });
});
