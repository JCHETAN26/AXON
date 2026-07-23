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

export class WorkspaceStore {
  private workspaces = new Map<string, WorkspaceState>();

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
}
