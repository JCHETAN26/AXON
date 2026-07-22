import { ArchitectureNode } from "@axon/ui";

import { DualTheme, Section } from "./section";

export function ArchitectureNodesSection() {
  return (
    <Section
      title="ArchitectureNode"
      description="The core product primitive, shown on the 40px architectural canvas grid in every state."
    >
      <DualTheme>
        <div className="bg-canvas-grid flex flex-wrap gap-6 border border-border p-6">
          <ArchitectureNode
            className="w-56"
            category="Compute"
            name="api-gateway"
            meta="us-east-1 · 3 replicas"
            health="healthy"
          />
          <ArchitectureNode
            className="w-56"
            category="Compute"
            name="checkout-service"
            meta="rps 840 · p99 210ms"
            state="selected"
            health="healthy"
          />
          <ArchitectureNode
            className="w-56"
            category="Data"
            name="orders-db"
            meta="pg16 · conn 92/100"
            state="critical"
            health="down"
          />
          <ArchitectureNode
            className="w-56"
            category="Cache"
            name="redis-cluster"
            meta="hit 97.2% · 3 shards"
            state="recommended"
          />
          <ArchitectureNode
            className="w-56"
            category="Messaging"
            name="event-bus"
            meta="planned"
            state="planned"
          />
          <ArchitectureNode
            className="w-56"
            category="Edge"
            name="waf"
            meta="managed ruleset"
            locked
            health="degraded"
          />
        </div>
      </DualTheme>
    </Section>
  );
}
