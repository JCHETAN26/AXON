import { randomBytes, createHash } from "node:crypto";
import { and, eq, isNull, desc, sql } from "drizzle-orm";

import { type Database } from "../db/client";
import { localAgentConnections } from "../db/schema";

const TOKEN_PREFIX = "axon_agent_";
const CREDENTIAL_PREFIX = "axon_agent_cred_";
const TOKEN_BYTES = 32;
const CREDENTIAL_BYTES = 32;
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes for pairing
const TOKEN_EXPIRY_SECONDS = TOKEN_EXPIRY_MS / 1000;

export interface CreateAgentParams {
  agentName: string;
  machineLabel: string;
  workspaceScope: string;
  allowedCapabilities?: string[];
}

export interface AgentConnection {
  id: string;
  ownerId?: string;
  agentName: string;
  machineLabel: string;
  workspaceScope: string;
  allowedCapabilities: string[];
  lastConnectedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AgentCredential {
  agent: AgentConnection & { ownerId: string };
  credential: string;
}

/**
 * Manages local MCP agent connections with secure pairing tokens.
 *
 * Tokens are shown exactly once at creation and stored only as SHA-256 hashes.
 * Agents are scoped to specific workspaces and authenticated users.
 */
export class LocalAgentService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  /**
   * Create a new agent pairing. Returns the plaintext token exactly once.
   * The token is valid for 5 minutes and can only be used once.
   */
  async createAgent(params: CreateAgentParams): Promise<{ agentId: string; token: string }> {
    const tokenRaw = randomBytes(TOKEN_BYTES).toString("hex");
    const token = `${TOKEN_PREFIX}${tokenRaw}`;
    const tokenHash = this.hashToken(token);

    const inserted = await this.db
      .insert(localAgentConnections)
      .values({
        ownerId: this.ownerId,
        agentName: params.agentName,
        machineLabel: params.machineLabel,
        tokenHash,
        workspaceScope: params.workspaceScope,
        allowedCapabilities: params.allowedCapabilities ?? [],
      })
      .returning({ id: localAgentConnections.id });

    const agentId = inserted[0]?.id;
    if (!agentId) throw new Error("Failed to create agent connection");

    return { agentId, token };
  }

  /**
   * Exchange a short-lived pairing token for a durable revocable agent
   * credential. The pairing token is single-use and scoped to the created
   * agent connection; the raw credential is returned exactly once.
   */
  async exchangePairingToken(agentId: string, token: string): Promise<AgentCredential | null> {
    const tokenHash = this.hashToken(token);
    const connectedAt = new Date();
    const credential = `${CREDENTIAL_PREFIX}${randomBytes(CREDENTIAL_BYTES).toString("hex")}`;
    const credentialHash = this.hashToken(credential);

    // Atomic single-use claim: mint the credential and flip lastConnectedAt only
    // if the row is still unclaimed (lastConnectedAt IS NULL), unrevoked, and
    // unexpired — all evaluated in one statement, returning the row. This
    // compare-and-swap is race-safe: of any number of concurrent replays exactly
    // one matches and gets the row back; the losers get zero rows. Expiry uses the
    // DB clock (`now()` vs the stored created_at) so no naive-`timestamp` value
    // ever crosses the JS boundary, where the driver's local-zone parse would skew
    // the comparison.
    const claimed = await this.db
      .update(localAgentConnections)
      .set({ credentialHash, credentialIssuedAt: connectedAt, lastConnectedAt: connectedAt })
      .where(
        and(
          eq(localAgentConnections.id, agentId),
          eq(localAgentConnections.tokenHash, tokenHash),
          isNull(localAgentConnections.revokedAt),
          isNull(localAgentConnections.lastConnectedAt),
          sql`${localAgentConnections.createdAt} > now() - make_interval(secs => ${TOKEN_EXPIRY_SECONDS})`,
        ),
      )
      .returning();

    const agent = claimed[0];
    if (!agent) return null;

    return {
      credential,
      agent: {
        id: agent.id,
        ownerId: agent.ownerId,
        agentName: agent.agentName,
        machineLabel: agent.machineLabel,
        workspaceScope: agent.workspaceScope,
        allowedCapabilities: agent.allowedCapabilities as string[],
        lastConnectedAt: connectedAt,
        revokedAt: null,
        createdAt: agent.createdAt,
      },
    };
  }

  /**
   * Backward-compatible pairing validation used by older tests/callers.
   * Prefer exchangePairingToken for real local-agent authentication.
   */
  async validateToken(token: string): Promise<AgentConnection | null> {
    const tokenHash = this.hashToken(token);
    const connectedAt = new Date();

    // Same atomic single-use claim as exchangePairingToken, additionally scoped to
    // this owner. Replay, revocation, and expiry are all enforced race-safely and
    // DB-side in the WHERE clause so concurrent uses cannot both succeed.
    const claimed = await this.db
      .update(localAgentConnections)
      .set({ lastConnectedAt: connectedAt })
      .where(
        and(
          eq(localAgentConnections.tokenHash, tokenHash),
          eq(localAgentConnections.ownerId, this.ownerId),
          isNull(localAgentConnections.revokedAt),
          isNull(localAgentConnections.lastConnectedAt),
          sql`${localAgentConnections.createdAt} > now() - make_interval(secs => ${TOKEN_EXPIRY_SECONDS})`,
        ),
      )
      .returning();

    const agent = claimed[0];
    if (!agent) return null;

    return {
      id: agent.id,
      agentName: agent.agentName,
      machineLabel: agent.machineLabel,
      workspaceScope: agent.workspaceScope,
      allowedCapabilities: agent.allowedCapabilities as string[],
      lastConnectedAt: connectedAt,
      revokedAt: null,
      createdAt: agent.createdAt,
    };
  }

  async authenticateCredential(
    agentId: string,
    credential: string,
  ): Promise<(AgentConnection & { ownerId: string }) | null> {
    if (!credential.startsWith(CREDENTIAL_PREFIX)) return null;

    const credentialHash = this.hashToken(credential);
    const rows = await this.db
      .select()
      .from(localAgentConnections)
      .where(
        and(
          eq(localAgentConnections.id, agentId),
          eq(localAgentConnections.credentialHash, credentialHash),
          isNull(localAgentConnections.revokedAt),
        ),
      )
      .limit(1);

    const agent = rows[0];
    if (!agent) return null;

    const connectedAt = new Date();
    await this.db
      .update(localAgentConnections)
      .set({ lastConnectedAt: connectedAt })
      .where(eq(localAgentConnections.id, agent.id));

    return {
      id: agent.id,
      ownerId: agent.ownerId,
      agentName: agent.agentName,
      machineLabel: agent.machineLabel,
      workspaceScope: agent.workspaceScope,
      allowedCapabilities: agent.allowedCapabilities as string[],
      lastConnectedAt: connectedAt,
      revokedAt: null,
      createdAt: agent.createdAt,
    };
  }

  /**
   * List all agent connections for the current user.
   */
  async listAgents(): Promise<AgentConnection[]> {
    const rows = await this.db
      .select()
      .from(localAgentConnections)
      .where(eq(localAgentConnections.ownerId, this.ownerId))
      .orderBy(desc(localAgentConnections.createdAt));

    return rows.map((r) => ({
      id: r.id,
      agentName: r.agentName,
      machineLabel: r.machineLabel,
      workspaceScope: r.workspaceScope,
      allowedCapabilities: r.allowedCapabilities as string[],
      lastConnectedAt: r.lastConnectedAt,
      revokedAt: r.revokedAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Revoke an agent connection immediately.
   */
  async revokeAgent(agentId: string): Promise<void> {
    await this.db
      .update(localAgentConnections)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(localAgentConnections.id, agentId), eq(localAgentConnections.ownerId, this.ownerId)),
      );
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
