import { McpCommandPreview } from "./mcp-command-preview";
import { McpDataFlow } from "./mcp-data-flow";
import { McpSecurityControls } from "./mcp-security-controls";

export function LocalMcpWorkflow() {
  return (
    <section
      id="mcp"
      aria-labelledby="mcp-heading"
      className="scroll-mt-14 border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="mcp-heading" className="type-headline-lg max-w-2xl text-balance">
          Bring architecture intelligence into your coding workflow.
        </h2>
        <p className="type-body-lg mt-4 max-w-2xl text-foreground-muted">
          Analyze repositories locally, build a sanitized architecture model, and decide exactly
          what is shared with the AXON web studio.
        </p>
        <p className="type-label-caps mt-3 text-accent">Interactive workflow preview</p>
        <div className="mt-12">
          <McpDataFlow />
        </div>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
          <McpSecurityControls />
          <McpCommandPreview />
        </div>
      </div>
    </section>
  );
}
