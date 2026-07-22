import { Button } from "@axon/ui";

import { DualTheme, Section } from "./section";

export function ButtonsSection() {
  return (
    <Section
      title="Button"
      description="Primary inverts between themes, secondary relies on a strong border, technical actions use monospace labels."
    >
      <DualTheme>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Start Building Free</Button>
            <Button variant="secondary">View Interactive Demo</Button>
            <Button variant="technical">axon audit --run</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm">
              Preview Change
            </Button>
            <Button variant="primary" size="md">
              Preview Change
            </Button>
            <Button variant="primary" size="lg">
              Preview Change
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled>
              Apply Patch
            </Button>
            <Button variant="secondary" disabled>
              Simulate Traffic
            </Button>
            <Button variant="technical" disabled>
              axon simulate
            </Button>
          </div>
        </div>
      </DualTheme>
    </Section>
  );
}
