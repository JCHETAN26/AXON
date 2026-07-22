const FOOTER_LINKS = [
  { label: "Product", href: "#product" },
  { label: "MCP", href: "#mcp" },
  { label: "Simulation", href: "#simulation" },
  { label: "Monitoring", href: "#monitoring" },
  { label: "Pricing", href: "#pricing" },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Data Handling", href: "/data-handling" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-foreground px-5 py-10 md:px-8 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-foreground">AXON</p>
          <p className="type-label-caps mt-2 text-foreground-muted">
            Living architecture intelligence
          </p>
          <p className="type-mono-data mt-4 text-foreground-muted">
            © 2026 AXON · beta · pricing provisional
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="type-label-caps text-foreground-muted transition-colors motion-safe:duration-(--duration-fast) hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="type-label-caps text-foreground-muted transition-colors motion-safe:duration-(--duration-fast) hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
