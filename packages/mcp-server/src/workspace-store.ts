import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const MCP_SERVER_VERSION = "0.1.0";

/**
 * Workspace store holding local architecture state.
 * Used by the MCP server for in-memory storage during local mode.
 */
export interface WorkspaceState {
  rootDir: string;
  architecture: unknown | null;
  evidence: unknown[];
  findings: unknown[];
  scenarios: Map<string, unknown>;
  lastAnalyzedAt: Date | null;
}

interface SerializedWorkspaceState {
  rootDir: string;
  architecture: unknown | null;
  evidence: unknown[];
  findings: unknown[];
  scenarios: [string, unknown][];
  lastAnalyzedAt: string | null;
}

interface SerializedWorkspaceStore {
  version: typeof MCP_SERVER_VERSION;
  savedAt: string;
  workspaces: SerializedWorkspaceState[];
}

export class WorkspaceStore {
  private workspaces = new Map<string, WorkspaceState>();

  constructor(initialStates: WorkspaceState[] = []) {
    for (const state of initialStates) {
      this.workspaces.set(state.rootDir, state);
    }
  }

  get(rootDir: string): WorkspaceState | undefined {
    return this.workspaces.get(rootDir);
  }

  set(rootDir: string, state: WorkspaceState): void {
    this.workspaces.set(rootDir, state);
  }

  getOrCreate(rootDir: string): WorkspaceState {
    let state = this.workspaces.get(rootDir);
    if (!state) {
      state = {
        rootDir,
        architecture: null,
        evidence: [],
        findings: [],
        scenarios: new Map(),
        lastAnalyzedAt: null,
      };
      this.workspaces.set(rootDir, state);
    }
    return state;
  }

  delete(rootDir: string): boolean {
    return this.workspaces.delete(rootDir);
  }

  list(): WorkspaceState[] {
    return Array.from(this.workspaces.values());
  }

  toJSON(): SerializedWorkspaceStore {
    return {
      version: MCP_SERVER_VERSION,
      savedAt: new Date().toISOString(),
      workspaces: this.list().map((state) => ({
        rootDir: state.rootDir,
        architecture: state.architecture,
        evidence: state.evidence,
        findings: state.findings,
        scenarios: Array.from(state.scenarios.entries()),
        lastAnalyzedAt: state.lastAnalyzedAt?.toISOString() ?? null,
      })),
    };
  }

  saveToFile(filePath: string): void {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(this.toJSON(), null, 2)}\n`, {
      encoding: "utf-8",
      mode: 0o600,
    });
    chmodSync(filePath, 0o600);
  }

  static loadFromFile(filePath: string): WorkspaceStore {
    if (!existsSync(filePath)) return new WorkspaceStore();

    const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as Partial<SerializedWorkspaceStore>;
    const states =
      parsed.workspaces?.map((state): WorkspaceState => {
        return {
          rootDir: state.rootDir,
          architecture: state.architecture ?? null,
          evidence: state.evidence ?? [],
          findings: state.findings ?? [],
          scenarios: new Map(state.scenarios ?? []),
          lastAnalyzedAt: state.lastAnalyzedAt ? new Date(state.lastAnalyzedAt) : null,
        };
      }) ?? [];

    return new WorkspaceStore(states);
  }
}
