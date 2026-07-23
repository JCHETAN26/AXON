import { App } from "@octokit/app";

import { getGithubAppConfig, type GithubAppConfig } from "./config";
import {
  GithubError,
  type GithubGateway,
  type InstallationInfo,
  type RemoteRepository,
  type RemoteTree,
  type RemoteTreeEntry,
} from "./gateway";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REPO_PAGES = 10; // 100/page → up to 1000 granted repos
const MAX_TREE_ENTRIES = 25_000;

/* eslint-disable @typescript-eslint/no-explicit-any -- Octokit responses are dynamic; we narrow into typed shapes. */

function mapError(error: unknown): never {
  const status = (error as { status?: number }).status;
  if (status === 404) throw new GithubError("not-found");
  if (status === 403 || status === 429) {
    const remaining = (error as any)?.response?.headers?.["x-ratelimit-remaining"];
    throw new GithubError(remaining === "0" ? "rate-limited" : "forbidden");
  }
  if (status === 401) throw new GithubError("forbidden");
  throw new GithubError("unavailable");
}

function withTimeout(): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/**
 * Octokit-backed GitHub App gateway. Installation tokens are acquired per
 * request by `getInstallationOctokit` and never persisted. Errors are mapped to
 * a small safe enum — GitHub response bodies never propagate to callers.
 */
export class OctokitGithubGateway implements GithubGateway {
  private readonly app: App;

  constructor(config: GithubAppConfig) {
    this.app = new App({ appId: config.appId, privateKey: config.privateKey });
  }

  async verifyInstallation(installationId: number): Promise<InstallationInfo | null> {
    const { signal, done } = withTimeout();
    try {
      const res = await this.app.octokit.request("GET /app/installations/{installation_id}", {
        installation_id: installationId,
        request: { signal },
      });
      const data = res.data as any;
      if (data?.account == null) return null;
      return {
        installationId,
        accountId: data.account.id,
        accountLogin: data.account.login ?? data.account.slug ?? "",
        accountType: data.account.type ?? "Organization",
        permissions: (data.permissions ?? {}) as Record<string, string>,
      };
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      mapError(error);
    } finally {
      done();
    }
  }

  async listInstallationRepositories(installationId: number): Promise<RemoteRepository[]> {
    const octokit = await this.app.getInstallationOctokit(installationId);
    const out: RemoteRepository[] = [];
    try {
      for (let page = 1; page <= MAX_REPO_PAGES; page += 1) {
        const { signal, done } = withTimeout();
        try {
          const res = await octokit.request("GET /installation/repositories", {
            per_page: 100,
            page,
            request: { signal },
          });
          const repos = (res.data as any).repositories as any[];
          for (const r of repos) {
            out.push({
              repoGithubId: r.id,
              ownerLogin: r.owner?.login ?? "",
              name: r.name,
              fullName: r.full_name,
              defaultBranch: r.default_branch ?? "main",
              visibility: r.private ? "private" : "public",
              archived: Boolean(r.archived),
              url: r.html_url,
            });
          }
          if (repos.length < 100) break;
        } finally {
          done();
        }
      }
    } catch (error) {
      mapError(error);
    }
    return out;
  }

  async getBranchHeadSha(
    installationId: number,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<string> {
    const octokit = await this.app.getInstallationOctokit(installationId);
    const { signal, done } = withTimeout();
    try {
      const res = await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
        owner,
        repo,
        branch,
        request: { signal },
      });
      return (res.data as any).commit.sha as string;
    } catch (error) {
      mapError(error);
    } finally {
      done();
    }
  }

  async getTree(
    installationId: number,
    owner: string,
    repo: string,
    commitSha: string,
  ): Promise<RemoteTree> {
    const octokit = await this.app.getInstallationOctokit(installationId);
    const { signal, done } = withTimeout();
    try {
      const res = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
        owner,
        repo,
        tree_sha: commitSha,
        recursive: "1",
        request: { signal },
      });
      const data = res.data as any;
      const entries: RemoteTreeEntry[] = (data.tree as any[]).slice(0, MAX_TREE_ENTRIES).map((e) => ({
        path: e.path,
        type: e.type,
        size: typeof e.size === "number" ? e.size : undefined,
        // mode 120000 = symlink, 160000 = submodule (gitlink) — never fetched.
        special: e.mode === "120000" || e.mode === "160000",
      }));
      return { commitSha, entries, truncated: Boolean(data.truncated) };
    } catch (error) {
      mapError(error);
    } finally {
      done();
    }
  }

  async getFileText(
    installationId: number,
    owner: string,
    repo: string,
    path: string,
    ref: string,
    maxBytes: number,
  ): Promise<string> {
    const octokit = await this.app.getInstallationOctokit(installationId);
    const { signal, done } = withTimeout();
    try {
      const res = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path,
        ref,
        request: { signal },
      });
      const data = res.data as any;
      if (Array.isArray(data) || data.type !== "file" || typeof data.content !== "string") {
        throw new GithubError("not-found");
      }
      if (typeof data.size === "number" && data.size > maxBytes) {
        throw new GithubError("too-large");
      }
      const buf = Buffer.from(data.content, data.encoding === "base64" ? "base64" : "utf8");
      if (buf.byteLength > maxBytes) throw new GithubError("too-large");
      return buf.toString("utf8");
    } catch (error) {
      if (error instanceof GithubError) throw error;
      mapError(error);
    } finally {
      done();
    }
  }
}

/** Returns a gateway when the GitHub App is configured, else null (disabled). */
export function getGithubGateway(env: NodeJS.ProcessEnv = process.env): GithubGateway | null {
  const config = getGithubAppConfig(env);
  return config === null ? null : new OctokitGithubGateway(config);
}
