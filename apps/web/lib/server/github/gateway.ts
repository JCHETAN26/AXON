/**
 * A narrow interface over the GitHub App API. Routes and services depend on this
 * abstraction so they are testable with deterministic fixtures — no live GitHub
 * App is required in automated tests. The Octokit-backed implementation lives in
 * `octokit-gateway.ts`; installation access tokens are minted server-side per
 * request and never persisted or returned to callers.
 */

export interface InstallationInfo {
  readonly installationId: number;
  readonly accountId: number;
  readonly accountLogin: string;
  readonly accountType: string; // "User" | "Organization"
  readonly permissions: Record<string, string>;
}

export interface RemoteRepository {
  readonly repoGithubId: number;
  readonly ownerLogin: string;
  readonly name: string;
  readonly fullName: string;
  readonly defaultBranch: string;
  readonly visibility: string; // "public" | "private"
  readonly archived: boolean;
  readonly url: string;
}

/** A single entry in a repository's git tree. */
export interface RemoteTreeEntry {
  readonly path: string;
  readonly type: "blob" | "tree" | "commit";
  readonly size: number | undefined;
  /** True when the blob is a symlink or submodule (skipped by inventory). */
  readonly special: boolean;
}

export interface RemoteTree {
  readonly commitSha: string;
  readonly entries: readonly RemoteTreeEntry[];
  /** True when GitHub truncated the tree (inventory treats this as a bound hit). */
  readonly truncated: boolean;
}

export type GithubGatewayError =
  | "not-found"
  | "forbidden"
  | "rate-limited"
  | "unavailable"
  | "too-large";

export class GithubError extends Error {
  constructor(readonly code: GithubGatewayError) {
    super(`GitHub request failed: ${code}`);
    this.name = "GithubError";
  }
}

export interface GithubGateway {
  /** Confirms the App can access the installation and returns safe metadata. */
  verifyInstallation(installationId: number): Promise<InstallationInfo | null>;
  /** Repositories actually granted to the installation (bounded pagination). */
  listInstallationRepositories(installationId: number): Promise<RemoteRepository[]>;
  /** The head commit SHA of a branch. */
  getBranchHeadSha(installationId: number, owner: string, repo: string, branch: string): Promise<string>;
  /** The recursive git tree at a commit. */
  getTree(installationId: number, owner: string, repo: string, commitSha: string): Promise<RemoteTree>;
  /** UTF-8 text of a blob, or throws `too-large`/`not-found`. Never binary. */
  getFileText(
    installationId: number,
    owner: string,
    repo: string,
    path: string,
    ref: string,
    maxBytes: number,
  ): Promise<string>;
}
