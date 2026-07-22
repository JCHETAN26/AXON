import { Section } from "./section";

const TYPE_STYLES: { utility: string; spec: string; sample: string }[] = [
  { utility: "type-display-lg", spec: "Space Grotesk 72/0.9 700", sample: "Architecture" },
  { utility: "type-display-lg-mobile", spec: "Space Grotesk 40/0.95 700", sample: "Architecture" },
  { utility: "type-headline-lg", spec: "Space Grotesk 48/1 700", sample: "System blueprint" },
  { utility: "type-headline-md", spec: "Space Grotesk 32/1.15 600", sample: "Audit findings" },
  {
    utility: "type-body-lg",
    spec: "Space Grotesk 18/1.55 400",
    sample: "AXON detects reliability, security and scalability risks before they ship.",
  },
  {
    utility: "type-body-md",
    spec: "Space Grotesk 15/1.55 400",
    sample: "Simulate traffic and component failure against your current architecture.",
  },
  { utility: "type-label-caps", spec: "Geist 11/16 600 +0.1em caps", sample: "Run audit" },
  {
    utility: "type-mono-data",
    spec: "JetBrains Mono 12/16 500",
    sample: "p99=241ms rps=1.2k err=0.02%",
  },
];

export function TypographySection() {
  return (
    <Section
      title="Typography"
      description="Space Grotesk for brand voice, Geist for compact interface labels, JetBrains Mono for technical metadata."
    >
      <div className="flex flex-col divide-y divide-border border border-border">
        {TYPE_STYLES.map(({ utility, spec, sample }) => (
          <div key={utility} className="flex flex-col gap-3 p-6 lg:flex-row lg:items-baseline">
            <div className="w-64 shrink-0">
              <code className="type-mono-data text-accent">.{utility}</code>
              <p className="type-mono-data mt-1 text-foreground-muted">{spec}</p>
            </div>
            <p className={`${utility} min-w-0 break-words`}>{sample}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
