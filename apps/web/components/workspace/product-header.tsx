import { ThemeToggle, cx } from "@axon/ui";
import Link from "next/link";
import { type ReactNode } from "react";

const LINK_CLASSES = cx(
  "type-label-caps text-foreground-muted transition-colors",
  "motion-safe:duration-(--duration-fast) hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
);

/** Compact header for product routes. `account` renders on the right. */
export function ProductHeader({ account }: { account?: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-5 md:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            AXON
          </Link>
          <nav aria-label="Workspace" className="flex items-center gap-4">
            <Link href="/projects" className={LINK_CLASSES}>
              Projects
            </Link>
            <Link href="/account" className={LINK_CLASSES}>
              Account
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {account ?? (
            <span className="type-mono-data hidden text-foreground-muted sm:inline">
              local-first beta · data stays in this browser
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
