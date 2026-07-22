import { MCP_REDACTIONS } from "@/data/mcp-workflow";

/**
 * What leaves the machine and what never does — redaction transformations
 * rendered as structured data.
 */
export function McpSecurityControls() {
  return (
    <div className="border-2 border-border-strong bg-surface p-5">
      <p className="type-mono-data text-accent">SECRET_REDACTION</p>
      <p className="type-body-md mt-2 text-foreground-muted">
        Sensitive values are replaced locally before anything can be shared. The sanitized model
        contains structure, not secrets.
      </p>
      <dl className="mt-4 flex flex-col divide-y divide-border border border-border">
        {MCP_REDACTIONS.map((redaction) => (
          <div
            key={redaction.source}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-2.5"
          >
            <dt className="type-mono-data text-foreground">{redaction.source}</dt>
            <span aria-hidden className="type-mono-data text-foreground-muted">
              →
            </span>
            <dd className="type-mono-data text-accent">{redaction.replacement}</dd>
          </div>
        ))}
      </dl>
      <ul className="type-mono-data mt-4 flex flex-col gap-1.5 text-foreground-muted">
        <li>· parsing and redaction run on your machine</li>
        <li>· synchronization requires explicit approval</li>
        <li>· only the sanitized model is shared</li>
      </ul>
    </div>
  );
}
