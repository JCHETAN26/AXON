import { type ComposeService, type Confidence } from "./types";

/** Broad architecture role a service maps to, used to pick edge kinds. */
export type ServiceRole =
  | "gateway"
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "observability"
  | "storage"
  | "external"
  | "unknown";

export interface Classification {
  readonly role: ServiceRole;
  readonly category: string;
  readonly confidence: Confidence;
  readonly rationale: string;
}

interface ImageRule {
  readonly role: ServiceRole;
  readonly category: string;
  readonly images: readonly string[];
}

/**
 * Image-name → role table. Matched by substring against the image's repository
 * portion. Order matters only for readability; a given image matches one rule.
 */
const IMAGE_RULES: readonly ImageRule[] = [
  {
    role: "database",
    category: "Database",
    images: [
      "postgres",
      "mysql",
      "mariadb",
      "mongo",
      "cockroach",
      "clickhouse",
      "cassandra",
      "influxdb",
      "timescale",
    ],
  },
  { role: "cache", category: "Cache", images: ["redis", "memcached", "valkey", "varnish"] },
  {
    role: "queue",
    category: "Broker",
    images: ["rabbitmq", "kafka", "nats", "activemq", "mosquitto", "redpanda", "zookeeper"],
  },
  {
    role: "gateway",
    category: "Gateway",
    images: ["nginx", "traefik", "haproxy", "caddy", "envoy", "kong", "apisix"],
  },
  {
    role: "observability",
    category: "Observability",
    images: [
      "prometheus",
      "grafana",
      "jaeger",
      "loki",
      "tempo",
      "datadog",
      "otel",
      "opentelemetry",
      "kibana",
      "fluentd",
      "fluent-bit",
    ],
  },
  { role: "storage", category: "Storage", images: ["minio", "seaweedfs", "ceph"] },
  {
    role: "database",
    category: "Search",
    images: ["elasticsearch", "opensearch", "solr", "meilisearch", "typesense"],
  },
];

function repositoryOf(image: string): string {
  // Strip a tag ("name:tag") and registry host, keep the repository path.
  const withoutTag = image.split("@")[0]?.split(":")[0] ?? image;
  const segments = withoutTag.split("/");
  return (segments[segments.length - 1] ?? withoutTag).toLowerCase();
}

/**
 * Deterministically classifies a service from its image and configuration.
 * Nothing is executed and no image manifest is inspected — the decision is
 * based only on the supplied Compose document.
 */
export function classifyService(service: ComposeService): Classification {
  const image = service.image;

  if (image !== undefined) {
    const repo = repositoryOf(image);
    for (const rule of IMAGE_RULES) {
      if (rule.images.some((keyword) => repo.includes(keyword))) {
        return {
          role: rule.role,
          category: rule.category,
          confidence: "high",
          rationale: `Image "${image}" matches a known ${rule.category.toLowerCase()} image.`,
        };
      }
    }
    // A published web/app framework image, or any other named image.
    return {
      role: "service",
      category: "Service",
      confidence: "medium",
      rationale: `Image "${image}" is not a recognised infrastructure image; classified as a service.`,
    };
  }

  if (service.hasBuild) {
    return {
      role: "service",
      category: "Service",
      confidence: "medium",
      rationale:
        "Built from a local Dockerfile; classified as a service (build context not inspected).",
    };
  }

  return {
    role: "unknown",
    category: "Service",
    confidence: "low",
    rationale: "No image or build was detected; classification requires review.",
  };
}
