import { randomBytes, createHash } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";

import { type Database } from "../db/client";
import { localAgentConnections } from "../db/schema";

const TOKEN_PREFIX = "axon_agent_";
const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes for pairing

export interface CreateAgentParams {
  agentName: string;
  machineLabel: string;
  workspaceScope: string;
  allowedCapabilities?: string[];
}

export interface AgentConnection {
  id: string;
  agentName: string;
  machineLabel: string;
  workspaceScope: string;
  allowedCapabilities: string[];
  lastConnectedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
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
   * Validate an agent token. Returns the agent connection if valid.
   * Updates lastConnectedAt on successful validation. Pairing tokens are
   * short-lived and single-use; durable agent auth must use a separate
   * revocable credential when the local transport is wired.
   */
  async validateToken(token: string): Promise<AgentConnection | null> {
    const tokenHash = this.hashToken(token);

    const rows = await this.db
      .select()
      .from(localAgentConnections)
      .where(
        and(
          eq(localAgentConnections.tokenHash, tokenHash),
          eq(localAgentConnections.ownerId, this.ownerId),
          isNull(localAgentConnections.revokedAt),
        ),
      )
      .limit(1);

    const agent = rows[0];
    if (!agent) return null;
    if (agent.lastConnectedAt) return null;

    const expiresAt = agent.createdAt.getTime() + TOKEN_EXPIRY_MS;
    if (Date.now() > expiresAt) return null;

    // Update last connected timestamp
    const connectedAt = new Date();
    await this.db
      .update(localAgentConnections)
      .set({ lastConnectedAt: connectedAt })
      .where(eq(localAgentConnections.id, agent.id));

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
