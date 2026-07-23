export type ArchitectureIconProvider = "aws" | "gcp" | "azure" | "kubernetes" | "cncf" | "generic";

export type ArchitectureIconGlyph =
  | "ai"
  | "auth"
  | "cache"
  | "compute"
  | "database"
  | "gateway"
  | "kubernetes"
  | "observability"
  | "queue"
  | "storage"
  | "unknown";

export interface ArchitectureIconRecord {
  readonly id: string;
  readonly provider: ArchitectureIconProvider;
  readonly service: string;
  readonly logicalCategory: string;
  readonly aliases: readonly string[];
  readonly searchTerms: readonly string[];
  readonly assetPath: string;
  readonly source: string;
  readonly version: string;
  readonly licenseNote: string;
  readonly deprecated: boolean;
  readonly replacementId: string | null;
  readonly lightDarkSuitability: "both" | "light-only" | "dark-only";
  readonly defaultSize: number;
  readonly viewBox: string;
  readonly glyph: ArchitectureIconGlyph;
}

const VERSION = "2026.07.axon-generic-v1";
const GENERIC_LICENSE =
  "AXON-authored generic SVG glyph; not an official provider logo or redistributed provider asset.";

function icon(input: {
  id: string;
  provider: ArchitectureIconProvider;
  service: string;
  logicalCategory: string;
  aliases: readonly string[];
  searchTerms: readonly string[];
  glyph: ArchitectureIconGlyph;
}): ArchitectureIconRecord {
  return {
    ...input,
    assetPath: `axon-generic:${input.glyph}`,
    source: "axon-generic-registry",
    version: VERSION,
    licenseNote: GENERIC_LICENSE,
    deprecated: false,
    replacementId: null,
    lightDarkSuitability: "both",
    defaultSize: 20,
    viewBox: "0 0 20 20",
  };
}

export const UNKNOWN_ARCHITECTURE_ICON: ArchitectureIconRecord = icon({
  id: "generic.unknown",
  provider: "generic",
  service: "Unknown component",
  logicalCategory: "generic infrastructure",
  aliases: ["unknown", "service", "component"],
  searchTerms: ["unknown", "fallback", "generic", "component"],
  glyph: "unknown",
});

export const ARCHITECTURE_ICON_REGISTRY: readonly ArchitectureIconRecord[] = [
  icon({
    id: "generic.compute",
    provider: "generic",
    service: "Compute service",
    logicalCategory: "compute",
    aliases: ["compute", "service", "app service", "worker", "application"],
    searchTerms: ["compute", "service", "application", "worker", "runtime"],
    glyph: "compute",
  }),
  icon({
    id: "aws.ec2",
    provider: "aws",
    service: "Amazon EC2",
    logicalCategory: "compute",
    aliases: ["aws_instance", "ec2", "instance"],
    searchTerms: ["aws", "ec2", "compute", "vm", "instance"],
    glyph: "compute",
  }),
  icon({
    id: "aws.rds",
    provider: "aws",
    service: "Amazon RDS",
    logicalCategory: "database",
    aliases: ["aws_db_instance", "rds", "postgres", "mysql"],
    searchTerms: ["aws", "rds", "database", "postgres", "sql"],
    glyph: "database",
  }),
  icon({
    id: "aws.s3",
    provider: "aws",
    service: "Amazon S3",
    logicalCategory: "storage",
    aliases: ["aws_s3_bucket", "s3", "bucket"],
    searchTerms: ["aws", "s3", "storage", "object", "bucket"],
    glyph: "storage",
  }),
  icon({
    id: "aws.sqs",
    provider: "aws",
    service: "Amazon SQS",
    logicalCategory: "queue",
    aliases: ["aws_sqs_queue", "sqs", "queue"],
    searchTerms: ["aws", "sqs", "queue", "messaging"],
    glyph: "queue",
  }),
  icon({
    id: "aws.lambda",
    provider: "aws",
    service: "AWS Lambda",
    logicalCategory: "compute",
    aliases: ["aws_lambda_function", "lambda", "function", "serverless"],
    searchTerms: ["aws", "lambda", "serverless", "function", "compute"],
    glyph: "compute",
  }),
  icon({
    id: "aws.api-gateway",
    provider: "aws",
    service: "Amazon API Gateway",
    logicalCategory: "gateway",
    aliases: ["aws_api_gateway", "aws_apigatewayv2_api", "api gateway", "apigw"],
    searchTerms: ["aws", "api", "gateway", "edge", "http"],
    glyph: "gateway",
  }),
  icon({
    id: "aws.dynamodb",
    provider: "aws",
    service: "Amazon DynamoDB",
    logicalCategory: "database",
    aliases: ["aws_dynamodb_table", "dynamodb", "dynamo"],
    searchTerms: ["aws", "dynamodb", "database", "nosql", "table"],
    glyph: "database",
  }),
  icon({
    id: "aws.elasticache",
    provider: "aws",
    service: "Amazon ElastiCache",
    logicalCategory: "cache",
    aliases: ["aws_elasticache_cluster", "elasticache", "redis", "memcached"],
    searchTerms: ["aws", "elasticache", "cache", "redis", "memcached"],
    glyph: "cache",
  }),
  icon({
    id: "aws.cloudfront",
    provider: "aws",
    service: "Amazon CloudFront",
    logicalCategory: "gateway",
    aliases: ["aws_cloudfront_distribution", "cloudfront", "cdn"],
    searchTerms: ["aws", "cloudfront", "cdn", "edge", "delivery"],
    glyph: "gateway",
  }),
  icon({
    id: "aws.eks",
    provider: "aws",
    service: "Amazon EKS",
    logicalCategory: "kubernetes",
    aliases: ["aws_eks_cluster", "eks", "kubernetes"],
    searchTerms: ["aws", "eks", "kubernetes", "cluster", "containers"],
    glyph: "kubernetes",
  }),
  icon({
    id: "gcp.compute-engine",
    provider: "gcp",
    service: "Google Compute Engine",
    logicalCategory: "compute",
    aliases: ["google_compute_instance", "gce", "compute engine"],
    searchTerms: ["gcp", "compute", "vm", "instance"],
    glyph: "compute",
  }),
  icon({
    id: "gcp.cloud-sql",
    provider: "gcp",
    service: "Cloud SQL",
    logicalCategory: "database",
    aliases: ["google_sql_database_instance", "cloud sql", "postgres"],
    searchTerms: ["gcp", "database", "cloud sql", "postgres", "sql"],
    glyph: "database",
  }),
  icon({
    id: "gcp.cloud-run",
    provider: "gcp",
    service: "Cloud Run",
    logicalCategory: "compute",
    aliases: ["google_cloud_run_service", "cloud run", "serverless container"],
    searchTerms: ["gcp", "cloud run", "serverless", "container", "compute"],
    glyph: "compute",
  }),
  icon({
    id: "gcp.gke",
    provider: "gcp",
    service: "Google Kubernetes Engine",
    logicalCategory: "kubernetes",
    aliases: ["google_container_cluster", "gke", "kubernetes"],
    searchTerms: ["gcp", "gke", "kubernetes", "cluster", "containers"],
    glyph: "kubernetes",
  }),
  icon({
    id: "gcp.pubsub",
    provider: "gcp",
    service: "Pub/Sub",
    logicalCategory: "queue",
    aliases: ["google_pubsub_topic", "google_pubsub_subscription", "pubsub", "pub/sub"],
    searchTerms: ["gcp", "pubsub", "pub/sub", "queue", "messaging", "event"],
    glyph: "queue",
  }),
  icon({
    id: "gcp.cloud-storage",
    provider: "gcp",
    service: "Cloud Storage",
    logicalCategory: "storage",
    aliases: ["google_storage_bucket", "gcs", "cloud storage", "bucket"],
    searchTerms: ["gcp", "gcs", "storage", "object", "bucket"],
    glyph: "storage",
  }),
  icon({
    id: "gcp.firestore",
    provider: "gcp",
    service: "Firestore",
    logicalCategory: "database",
    aliases: ["google_firestore_database", "firestore", "document database"],
    searchTerms: ["gcp", "firestore", "database", "nosql", "document"],
    glyph: "database",
  }),
  icon({
    id: "gcp.cloud-functions",
    provider: "gcp",
    service: "Cloud Functions",
    logicalCategory: "compute",
    aliases: ["google_cloudfunctions_function", "cloud functions", "function"],
    searchTerms: ["gcp", "cloud functions", "serverless", "function", "compute"],
    glyph: "compute",
  }),
  icon({
    id: "azure.virtual-machine",
    provider: "azure",
    service: "Azure Virtual Machines",
    logicalCategory: "compute",
    aliases: ["azurerm_linux_virtual_machine", "azure vm", "virtual machine"],
    searchTerms: ["azure", "compute", "vm", "instance"],
    glyph: "compute",
  }),
  icon({
    id: "azure.app-service",
    provider: "azure",
    service: "Azure App Service",
    logicalCategory: "compute",
    aliases: ["azurerm_app_service", "azurerm_linux_web_app", "azure app service", "azure web app"],
    searchTerms: ["azure", "app service", "web app", "compute", "platform"],
    glyph: "compute",
  }),
  icon({
    id: "azure.functions",
    provider: "azure",
    service: "Azure Functions",
    logicalCategory: "compute",
    aliases: ["azurerm_function_app", "azure functions", "function"],
    searchTerms: ["azure", "functions", "serverless", "compute"],
    glyph: "compute",
  }),
  icon({
    id: "azure.aks",
    provider: "azure",
    service: "Azure Kubernetes Service",
    logicalCategory: "kubernetes",
    aliases: ["azurerm_kubernetes_cluster", "aks", "kubernetes"],
    searchTerms: ["azure", "aks", "kubernetes", "cluster", "containers"],
    glyph: "kubernetes",
  }),
  icon({
    id: "azure.storage-account",
    provider: "azure",
    service: "Azure Storage Account",
    logicalCategory: "storage",
    aliases: ["azurerm_storage_account", "blob storage", "storage account"],
    searchTerms: ["azure", "storage", "blob", "object", "account"],
    glyph: "storage",
  }),
  icon({
    id: "azure.sql-database",
    provider: "azure",
    service: "Azure SQL Database",
    logicalCategory: "database",
    aliases: ["azurerm_mssql_database", "azure sql", "mssql database"],
    searchTerms: ["azure", "sql", "database", "relational"],
    glyph: "database",
  }),
  icon({
    id: "azure.service-bus",
    provider: "azure",
    service: "Azure Service Bus",
    logicalCategory: "queue",
    aliases: ["azurerm_servicebus_queue", "service bus", "queue"],
    searchTerms: ["azure", "service bus", "queue", "messaging"],
    glyph: "queue",
  }),
  icon({
    id: "azure.cosmos-db",
    provider: "azure",
    service: "Azure Cosmos DB",
    logicalCategory: "database",
    aliases: ["azurerm_cosmosdb_account", "cosmos db", "cosmos"],
    searchTerms: ["azure", "cosmos", "database", "nosql", "document"],
    glyph: "database",
  }),
  icon({
    id: "kubernetes.workload",
    provider: "kubernetes",
    service: "Kubernetes workload",
    logicalCategory: "kubernetes",
    aliases: ["deployment", "statefulset", "daemonset", "pod", "k8s"],
    searchTerms: ["kubernetes", "k8s", "container", "pod", "workload"],
    glyph: "kubernetes",
  }),
  icon({
    id: "cncf.kafka",
    provider: "cncf",
    service: "Apache Kafka",
    logicalCategory: "queue",
    aliases: ["kafka", "topic", "event stream"],
    searchTerms: ["cncf", "kafka", "event", "stream", "queue", "messaging"],
    glyph: "queue",
  }),
  icon({
    id: "cncf.rabbitmq",
    provider: "cncf",
    service: "RabbitMQ",
    logicalCategory: "queue",
    aliases: ["rabbitmq", "amqp", "broker"],
    searchTerms: ["cncf", "rabbitmq", "queue", "broker", "messaging"],
    glyph: "queue",
  }),
  icon({
    id: "cncf.prometheus",
    provider: "cncf",
    service: "Prometheus",
    logicalCategory: "observability",
    aliases: ["prometheus", "prom", "metrics"],
    searchTerms: ["cncf", "prometheus", "metrics", "monitoring", "observability"],
    glyph: "observability",
  }),
  icon({
    id: "cncf.opentelemetry",
    provider: "cncf",
    service: "OpenTelemetry",
    logicalCategory: "observability",
    aliases: ["opentelemetry", "otel", "traces", "metrics"],
    searchTerms: ["cncf", "opentelemetry", "otel", "traces", "metrics", "observability"],
    glyph: "observability",
  }),
  icon({
    id: "generic.gateway",
    provider: "generic",
    service: "Gateway",
    logicalCategory: "gateway",
    aliases: ["gateway", "api gateway", "load balancer", "edge"],
    searchTerms: ["gateway", "edge", "api", "load balancer"],
    glyph: "gateway",
  }),
  icon({
    id: "generic.auth",
    provider: "generic",
    service: "Authentication provider",
    logicalCategory: "auth",
    aliases: ["auth", "oauth", "oidc", "identity provider", "sso"],
    searchTerms: ["authentication", "authorization", "oauth", "oidc", "identity", "sso"],
    glyph: "auth",
  }),
  icon({
    id: "generic.ai-model",
    provider: "generic",
    service: "AI model",
    logicalCategory: "ai",
    aliases: ["ai", "llm", "model", "openai", "anthropic"],
    searchTerms: ["ai", "llm", "model", "inference", "tokens"],
    glyph: "ai",
  }),
  icon({
    id: "generic.cache",
    provider: "generic",
    service: "Cache",
    logicalCategory: "cache",
    aliases: ["cache", "redis", "memcached"],
    searchTerms: ["cache", "redis", "memory"],
    glyph: "cache",
  }),
  icon({
    id: "generic.observability",
    provider: "generic",
    service: "Observability",
    logicalCategory: "observability",
    aliases: ["datadog", "prometheus", "opentelemetry", "monitoring", "logs"],
    searchTerms: ["observability", "monitoring", "metrics", "logs", "traces"],
    glyph: "observability",
  }),
  UNKNOWN_ARCHITECTURE_ICON,
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function haystack(record: ArchitectureIconRecord): string {
  return normalize(
    [
      record.provider,
      record.service,
      record.logicalCategory,
      ...record.aliases,
      ...record.searchTerms,
    ].join(" "),
  );
}

export function searchArchitectureIcons(query: string): ArchitectureIconRecord[] {
  const normalized = normalize(query);
  if (normalized.length === 0) return [];
  return ARCHITECTURE_ICON_REGISTRY.filter((record) => haystack(record).includes(normalized));
}

export function findArchitectureIconById(id: string | undefined): ArchitectureIconRecord | null {
  if (id === undefined) return null;
  return ARCHITECTURE_ICON_REGISTRY.find((record) => record.id === id) ?? null;
}

export function resolveArchitectureIcon(input: {
  readonly category?: string;
  readonly name?: string;
  readonly meta?: string;
}): ArchitectureIconRecord {
  const normalized = normalize([input.meta, input.name, input.category].filter(Boolean).join(" "));
  if (normalized.length === 0) return UNKNOWN_ARCHITECTURE_ICON;

  const exact = ARCHITECTURE_ICON_REGISTRY.flatMap((record) =>
    record.aliases.map((alias) => ({ record, alias: normalize(alias) })),
  )
    .filter((candidate) => candidate.alias.length > 0 && normalized.includes(candidate.alias))
    .sort((a, b) => b.alias.length - a.alias.length)[0]?.record;
  if (exact !== undefined) return exact;

  return (
    ARCHITECTURE_ICON_REGISTRY.find((record) =>
      normalized.includes(normalize(record.logicalCategory)),
    ) ?? UNKNOWN_ARCHITECTURE_ICON
  );
}
