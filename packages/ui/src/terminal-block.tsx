import { cx } from "./cx";

export interface TerminalBlockProps {
  /** Header label, e.g. "terminal" or a file path. */
  title?: string;
  lines: readonly string[];
  /** Prefix rendered before each line; pass "" for output-only blocks. */
  prompt?: string;
  className?: string;
}

/**
 * Compact terminal preview for CLI commands and technical output.
 * Sharp module geometry per docs/design/DESIGN.md §8.
 */
export function TerminalBlock({
  title = "terminal",
  lines,
  prompt = "$",
  className,
}: TerminalBlockProps) {
  return (
    <div className={cx("rounded-module border-2 border-border-strong bg-surface", className)}>
      <p className="type-mono-data border-b border-border px-3 py-2 text-foreground-muted">
        {title}
      </p>
      <div className="overflow-x-auto p-4">
        <code className="type-mono-data block whitespace-pre text-foreground">
          {lines.map((line, index) => (
            <span key={index} className="block leading-6">
              {prompt !== "" && (
                <span aria-hidden className="text-accent">
                  {prompt}{" "}
                </span>
              )}
              {line}
            </span>
          ))}
        </code>
      </div>
    </div>
  );
}
