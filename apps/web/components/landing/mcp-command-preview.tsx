import { TerminalBlock } from "@axon/ui";

import { MCP_COMMANDS } from "@/data/mcp-workflow";

export function McpCommandPreview() {
  return (
    <div className="flex flex-col gap-3">
      <TerminalBlock lines={MCP_COMMANDS} />
      <p className="type-mono-data text-foreground-muted">
        Works with any MCP-capable editor or agent. Commands shown are illustrative of the planned
        CLI.
      </p>
    </div>
  );
}
