import { DualTheme, Section } from "./section";

const TOKEN_GROUPS: { group: string; tokens: string[] }[] = [
  {
    group: "Surfaces",
    tokens: ["background", "surface", "surface-muted", "surface-subtle", "grid"],
  },
  {
    group: "Content & structure",
    tokens: ["foreground", "foreground-muted", "border-color", "border-strong"],
  },
  {
    group: "Primary & accent",
    tokens: ["primary", "primary-foreground", "accent", "accent-strong", "accent-muted"],
  },
  {
    group: "Semantic status",
    tokens: ["critical", "critical-muted", "warning", "warning-muted", "success", "success-muted"],
  },
];

export function ColorTokensSection() {
  return (
    <Section
      title="Color tokens"
      description="Semantic tokens from docs/design/DESIGN.md. Components never reference raw hex values."
    >
      <DualTheme>
        <div className="flex flex-col gap-6">
          {TOKEN_GROUPS.map(({ group, tokens }) => (
            <div key={group}>
              <p className="type-label-caps mb-3 text-foreground-muted">{group}</p>
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {tokens.map((token) => (
                  <li key={token} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-8 shrink-0 rounded-control border border-border"
                      style={{ backgroundColor: `var(--${token})` }}
                    />
                    <code className="type-mono-data text-foreground-muted">--{token}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DualTheme>
    </Section>
  );
}
