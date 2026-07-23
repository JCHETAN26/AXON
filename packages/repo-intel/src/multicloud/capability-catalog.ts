export type MultiCloudProvider = "aws" | "gcp" | "azure" | "neutral";

export type CloudCapabilityCategory =
  | "compute"
  | "database"
  | "storage"
  | "queue"
  | "cache"
  | "network"
  | "observability"
  | "ai"
  | "custom";

export interface CloudCapabilityRecord {
  readonly provider: Exclude<MultiCloudProvider, "neutral">;
  readonly serviceId: string;
  readonly technology: string;
  readonly displayName: string;
  readonly category: CloudCapabilityCategory;
  readonly deploymentModel: string;
  readonly scalingModel: string;
  readonly availabilityModel: string;
  readonly regionalBehavior: string;
  readonly consistencySemantics: string;
  readonly deliverySemantics: string;
  readonly networkingModel: string;
  readonly iamModel: string;
  readonly encryption: string;
  readonly backupAndRecovery: string;
  readonly operationalBurden: "low" | "medium" | "high";
  readonly pricingDimensions: readonly string[];
  readonly aliases: readonly string[];
  readonly migrationConsiderations: readonly string[];
  readonly sourceVersion: string;
  readonly lastReviewedDate: string;
}

export const MULTICLOUD_CATALOG_VERSION = "2026.07.fixture-v1";
export const MULTICLOUD_CATALOG_REVIEWED_DATE = "2026-07-01";

function capability(
  input: Pick<
    CloudCapabilityRecord,
    | "provider"
    | "serviceId"
    | "technology"
    | "displayName"
    | "category"
    | "deploymentModel"
    | "scalingModel"
    | "availabilityModel"
    | "regionalBehavior"
    | "consistencySemantics"
    | "deliverySemantics"
    | "networkingModel"
    | "iamModel"
    | "encryption"
    | "backupAndRecovery"
    | "operationalBurden"
    | "pricingDimensions"
    | "aliases"
    | "migrationConsiderations"
  >,
): CloudCapabilityRecord {
  return {
    ...input,
    sourceVersion: MULTICLOUD_CATALOG_VERSION,
    lastReviewedDate: MULTICLOUD_CATALOG_REVIEWED_DATE,
  };
}

const COMMON_VM = {
  category: "compute",
  deploymentModel: "virtual-machine",
  scalingModel: "instance groups or autoscaling sets",
  availabilityModel: "zonal instances with regional balancing patterns",
  regionalBehavior: "regional service with zonal placement",
  consistencySemantics: "stateless unless attached storage is introduced",
  deliverySemantics: "request-response when placed behind a gateway",
  networkingModel: "private network attachment plus public ingress options",
  iamModel: "instance/service identity",
  encryption: "disk encryption supported",
  backupAndRecovery: "snapshot and image-based recovery",
  operationalBurden: "medium",
  pricingDimensions: ["instance-hours", "storage", "egress"],
  migrationConsiderations: ["Review instance families, startup scripts, images, and network tags."],
} as const;

const COMMON_SQL = {
  category: "database",
  deploymentModel: "managed-relational-database",
  scalingModel: "vertical scaling with read replica patterns",
  availabilityModel: "regional high-availability options",
  regionalBehavior: "regional primary with optional replicas",
  consistencySemantics: "strong consistency for primary writes",
  deliverySemantics: "sql transactions",
  networkingModel: "private endpoint or controlled public endpoint",
  iamModel: "database auth plus cloud IAM integration",
  encryption: "encryption at rest and in transit supported",
  backupAndRecovery: "automated backup and point-in-time recovery options",
  operationalBurden: "low",
  pricingDimensions: ["instance-hours", "storage", "backup", "iops"],
  migrationConsiderations: [
    "Validate engine version, extensions, failover behavior, and maintenance windows.",
  ],
} as const;

const COMMON_OBJECT_STORAGE = {
  category: "storage",
  deploymentModel: "managed-object-storage",
  scalingModel: "provider-managed elastic capacity",
  availabilityModel: "regional or multi-region durability classes",
  regionalBehavior: "bucket/container region controls data residency",
  consistencySemantics: "object-level consistency semantics vary by operation",
  deliverySemantics: "object API",
  networkingModel: "public endpoint with private access options",
  iamModel: "bucket/container policies plus cloud IAM",
  encryption: "server-side encryption supported",
  backupAndRecovery: "versioning and lifecycle policies",
  operationalBurden: "low",
  pricingDimensions: ["gb-month", "requests", "egress"],
  migrationConsiderations: ["Review object naming, lifecycle rules, ACLs, and data-transfer cost."],
} as const;

const COMMON_QUEUE = {
  category: "queue",
  deploymentModel: "managed-messaging",
  scalingModel: "provider-managed throughput with quotas",
  availabilityModel: "regional managed availability",
  regionalBehavior: "regional endpoint",
  consistencySemantics: "eventual delivery metadata consistency",
  deliverySemantics: "at-least-once delivery",
  networkingModel: "service endpoint with private access options",
  iamModel: "publisher/subscriber IAM",
  encryption: "encryption at rest supported",
  backupAndRecovery: "dead-letter and replay behavior differs by provider",
  operationalBurden: "low",
  pricingDimensions: ["requests", "payload", "retention"],
  migrationConsiderations: [
    "Validate ordering, retry, visibility timeout, and dead-letter semantics.",
  ],
} as const;

export const MULTICLOUD_CAPABILITY_CATALOG: readonly CloudCapabilityRecord[] = [
  capability({
    ...COMMON_VM,
    provider: "aws",
    serviceId: "aws.ec2",
    technology: "aws_instance",
    displayName: "Amazon EC2",
    aliases: ["aws_instance", "ec2", "instance"],
  }),
  capability({
    ...COMMON_SQL,
    provider: "aws",
    serviceId: "aws.rds",
    technology: "aws_db_instance",
    displayName: "Amazon RDS",
    aliases: ["aws_db_instance", "rds"],
  }),
  capability({
    ...COMMON_OBJECT_STORAGE,
    provider: "aws",
    serviceId: "aws.s3",
    technology: "aws_s3_bucket",
    displayName: "Amazon S3",
    aliases: ["aws_s3_bucket", "s3", "bucket"],
  }),
  capability({
    ...COMMON_QUEUE,
    provider: "aws",
    serviceId: "aws.sqs",
    technology: "aws_sqs_queue",
    displayName: "Amazon SQS",
    aliases: ["aws_sqs_queue", "sqs", "queue"],
  }),
  capability({
    ...COMMON_VM,
    provider: "gcp",
    serviceId: "gcp.compute-engine",
    technology: "google_compute_instance",
    displayName: "Google Compute Engine",
    aliases: ["google_compute_instance", "gce", "compute engine"],
  }),
  capability({
    ...COMMON_SQL,
    provider: "gcp",
    serviceId: "gcp.cloud-sql",
    technology: "google_sql_database_instance",
    displayName: "Cloud SQL",
    aliases: ["google_sql_database_instance", "cloud sql"],
  }),
  capability({
    ...COMMON_OBJECT_STORAGE,
    provider: "gcp",
    serviceId: "gcp.cloud-storage",
    technology: "google_storage_bucket",
    displayName: "Cloud Storage",
    aliases: ["google_storage_bucket", "gcs"],
  }),
  capability({
    ...COMMON_QUEUE,
    provider: "gcp",
    serviceId: "gcp.pubsub",
    technology: "google_pubsub_topic",
    displayName: "Pub/Sub",
    aliases: ["google_pubsub_topic", "pubsub"],
    migrationConsiderations: [
      "Pub/Sub uses topic-subscription semantics; review queue consumers and ordering keys.",
    ],
  }),
  capability({
    ...COMMON_VM,
    provider: "azure",
    serviceId: "azure.virtual-machine",
    technology: "azurerm_linux_virtual_machine",
    displayName: "Azure Virtual Machines",
    aliases: ["azurerm_linux_virtual_machine", "azure vm"],
  }),
  capability({
    ...COMMON_SQL,
    provider: "azure",
    serviceId: "azure.postgresql-flexible-server",
    technology: "azurerm_postgresql_flexible_server",
    displayName: "Azure Database for PostgreSQL",
    aliases: ["azurerm_postgresql_flexible_server", "azure postgresql"],
  }),
  capability({
    ...COMMON_OBJECT_STORAGE,
    provider: "azure",
    serviceId: "azure.blob-storage",
    technology: "azurerm_storage_account",
    displayName: "Azure Blob Storage",
    aliases: ["azurerm_storage_account", "blob storage"],
  }),
  capability({
    ...COMMON_QUEUE,
    provider: "azure",
    serviceId: "azure.storage-queue",
    technology: "azurerm_storage_queue",
    displayName: "Azure Queue Storage",
    aliases: ["azurerm_storage_queue", "azure queue"],
    migrationConsiderations: [
      "Queue Storage is not a full topic/subscription service; Service Bus may be required.",
    ],
  }),
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findCloudCapability(input: {
  readonly provider: MultiCloudProvider;
  readonly technology?: string;
  readonly category?: string;
}): CloudCapabilityRecord | null {
  if (input.provider === "neutral") return null;
  const normalizedTechnology = input.technology ? normalize(input.technology) : "";
  const exact = MULTICLOUD_CAPABILITY_CATALOG.find(
    (record) =>
      record.provider === input.provider &&
      record.aliases.some((alias) => normalize(alias) === normalizedTechnology),
  );
  if (exact !== undefined) return exact;

  const category = input.category ? normalize(input.category) : "";
  return (
    MULTICLOUD_CAPABILITY_CATALOG.find(
      (record) => record.provider === input.provider && normalize(record.category) === category,
    ) ?? null
  );
}

export function listCloudCapabilities(provider: MultiCloudProvider): CloudCapabilityRecord[] {
  if (provider === "neutral") return [];
  return MULTICLOUD_CAPABILITY_CATALOG.filter((record) => record.provider === provider);
}
