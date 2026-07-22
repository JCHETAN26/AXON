import { type ReactNode } from "react";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-24">
      <h2 className="type-headline-md border-b border-border pb-4">{title}</h2>
      {description !== undefined && (
        <p className="type-body-md mt-3 max-w-2xl text-foreground-muted">{description}</p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}

/**
 * Renders the same children twice, once inside a light-scoped panel and once
 * inside a dark-scoped panel, so every state is reviewable in both themes at
 * once regardless of the global theme selection.
 */
export function DualTheme({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {(["light", "dark"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          className="rounded-module border border-border bg-background p-6 text-foreground"
        >
          <p className="type-label-caps mb-6 text-foreground-muted">{theme} theme</p>
          {children}
        </div>
      ))}
    </div>
  );
}
