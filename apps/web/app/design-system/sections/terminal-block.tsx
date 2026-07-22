import { TerminalBlock } from "@axon/ui";

import { DualTheme, Section } from "./section";

export function TerminalBlockSection() {
  return (
    <Section
      title="TerminalBlock"
      description="Compact terminal preview for CLI commands and technical output. JetBrains Mono only."
    >
      <DualTheme>
        <div className="flex flex-col gap-4">
          <TerminalBlock
            lines={[
              "npx axon scan .",
              "npx axon audit architecture.json",
              "npx axon simulate --traffic 10x",
            ]}
          />
          <TerminalBlock
            title="scan.log"
            prompt=""
            lines={["12 services detected", "4 groups assigned", "secrets redacted: 4"]}
          />
        </div>
      </DualTheme>
    </Section>
  );
}
