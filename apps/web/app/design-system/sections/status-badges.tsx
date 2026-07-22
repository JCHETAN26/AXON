import { StatusBadge } from "@axon/ui";

import { DualTheme, Section } from "./section";

export function StatusBadgesSection() {
  return (
    <Section
      title="StatusBadge"
      description="Every status pairs color with an icon shape and a text label — never color alone."
    >
      <DualTheme>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge kind="critical">Critical</StatusBadge>
          <StatusBadge kind="warning">Bottleneck</StatusBadge>
          <StatusBadge kind="success">Healthy</StatusBadge>
          <StatusBadge kind="info">Recommended</StatusBadge>
          <StatusBadge kind="neutral">Unverified</StatusBadge>
        </div>
      </DualTheme>
    </Section>
  );
}
