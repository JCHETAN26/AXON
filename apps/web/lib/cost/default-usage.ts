import { type UsageDriver, type UsageProfile } from "@axon/architecture-cost";
import { type ArchitectureDocument } from "@axon/diagram-schema";

export function defaultUsageFor(document: ArchitectureDocument): UsageProfile {
  return {
    drivers: document.nodes.flatMap((node): UsageDriver[] => {
      const key = `${node.meta ?? ""} ${node.category}`.toLowerCase();
      if (key.includes("queue") || key.includes("broker") || key.includes("rabbitmq")) {
        return [
          {
            id: `usage-${node.id}-requests`,
            componentId: node.id,
            unit: "requests-per-month",
            value: 2_000_000,
            source: "product-default",
            timeWindow: "monthly",
            confidence: "low",
            derivation: "Default queue operations until user supplies measured or modeled usage.",
            userOverride: false,
          },
        ];
      }
      if (key.includes("storage") || key.includes("bucket")) {
        return [
          {
            id: `usage-${node.id}-storage`,
            componentId: node.id,
            unit: "gb-month",
            value: 100,
            source: "product-default",
            timeWindow: "monthly",
            confidence: "low",
            derivation: "Default object storage usage until user supplies a measured value.",
            userOverride: false,
          },
        ];
      }
      if (key.includes("egress") || key.includes("cdn")) {
        return [
          {
            id: `usage-${node.id}-egress`,
            componentId: node.id,
            unit: "gb-egress",
            value: 250,
            source: "product-default",
            timeWindow: "monthly",
            confidence: "low",
            derivation: "Default internet egress until user supplies measured transfer.",
            userOverride: false,
          },
        ];
      }
      if (key.includes("database") || key.includes("compute") || key.includes("service")) {
        return [
          {
            id: `usage-${node.id}-hours`,
            componentId: node.id,
            unit: "instance-hours",
            value: 730,
            source: "product-default",
            timeWindow: "monthly",
            confidence: "low",
            derivation: "Default one continuously running instance for a 730-hour month.",
            userOverride: false,
          },
        ];
      }
      return [];
    }),
  };
}
