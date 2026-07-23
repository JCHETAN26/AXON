/**
 * Versioned, data-driven Terraform Resource Catalog.
 * Maps AWS and GCP Terraform resource types to logical architecture categories.
 */

export interface CatalogResourceMapping {
  resourceType: string;
  provider: "aws" | "gcp" | "azure" | "generic";
  category: "compute" | "database" | "storage" | "queue" | "network" | "load-balancer" | "cache" | "orchestrator" | "security" | "observability" | "unknown";
  technology: string;
  providerService: string;
  defaultIconId: string;
  supportedAttributes: string[];
  relationshipAttributes: string[];
  securityAttributes: string[];
  supportLevel: "supported" | "generic";
}

export const CATALOG_VERSION = "1.0.0";

const RESOURCE_CATALOG = new Map<string, CatalogResourceMapping>();

function registerMapping(mapping: CatalogResourceMapping) {
  RESOURCE_CATALOG.set(mapping.resourceType, mapping);
}

// --- AWS Networking ---
registerMapping({
  resourceType: "aws_vpc",
  provider: "aws",
  category: "network",
  technology: "VPC",
  providerService: "Amazon VPC",
  defaultIconId: "aws-vpc",
  supportedAttributes: ["cidr_block", "enable_dns_hostnames", "enable_dns_support"],
  relationshipAttributes: [],
  securityAttributes: ["enable_dns_support"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_subnet",
  provider: "aws",
  category: "network",
  technology: "Subnet",
  providerService: "Amazon VPC",
  defaultIconId: "aws-subnet",
  supportedAttributes: ["vpc_id", "cidr_block", "availability_zone", "map_public_ip_on_launch"],
  relationshipAttributes: ["vpc_id"],
  securityAttributes: ["map_public_ip_on_launch"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_security_group",
  provider: "aws",
  category: "security",
  technology: "Security Group",
  providerService: "Amazon VPC",
  defaultIconId: "aws-security-group",
  supportedAttributes: ["vpc_id", "ingress", "egress"],
  relationshipAttributes: ["vpc_id"],
  securityAttributes: ["ingress", "egress"],
  supportLevel: "supported",
});

// --- AWS Load Balancing & Ingress ---
registerMapping({
  resourceType: "aws_lb",
  provider: "aws",
  category: "load-balancer",
  technology: "ALB / NLB",
  providerService: "Elastic Load Balancing",
  defaultIconId: "aws-alb",
  supportedAttributes: ["subnets", "security_groups", "internal", "load_balancer_type"],
  relationshipAttributes: ["subnets", "security_groups"],
  securityAttributes: ["internal", "security_groups"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_alb",
  provider: "aws",
  category: "load-balancer",
  technology: "ALB",
  providerService: "Elastic Load Balancing",
  defaultIconId: "aws-alb",
  supportedAttributes: ["subnets", "security_groups", "internal"],
  relationshipAttributes: ["subnets", "security_groups"],
  securityAttributes: ["internal"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_cloudfront_distribution",
  provider: "aws",
  category: "load-balancer",
  technology: "CloudFront",
  providerService: "Amazon CloudFront",
  defaultIconId: "aws-cloudfront",
  supportedAttributes: ["origin", "enabled", "default_cache_behavior"],
  relationshipAttributes: ["origin"],
  securityAttributes: ["web_acl_id"],
  supportLevel: "supported",
});

// --- AWS Compute ---
registerMapping({
  resourceType: "aws_ecs_cluster",
  provider: "aws",
  category: "orchestrator",
  technology: "ECS Cluster",
  providerService: "Amazon ECS",
  defaultIconId: "aws-ecs",
  supportedAttributes: ["name"],
  relationshipAttributes: [],
  securityAttributes: [],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_ecs_service",
  provider: "aws",
  category: "compute",
  technology: "ECS Service",
  providerService: "Amazon ECS",
  defaultIconId: "aws-ecs-service",
  supportedAttributes: ["cluster", "task_definition", "desired_count", "load_balancer"],
  relationshipAttributes: ["cluster", "task_definition", "load_balancer"],
  securityAttributes: ["network_configuration"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_lambda_function",
  provider: "aws",
  category: "compute",
  technology: "Lambda",
  providerService: "AWS Lambda",
  defaultIconId: "aws-lambda",
  supportedAttributes: ["function_name", "runtime", "handler", "role", "environment"],
  relationshipAttributes: ["role", "vpc_config"],
  securityAttributes: ["role"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_eks_cluster",
  provider: "aws",
  category: "orchestrator",
  technology: "EKS Cluster",
  providerService: "Amazon EKS",
  defaultIconId: "aws-eks",
  supportedAttributes: ["name", "role_arn", "vpc_config"],
  relationshipAttributes: ["role_arn", "vpc_config"],
  securityAttributes: ["role_arn"],
  supportLevel: "supported",
});

// --- AWS Data ---
registerMapping({
  resourceType: "aws_db_instance",
  provider: "aws",
  category: "database",
  technology: "RDS PostgreSQL",
  providerService: "Amazon RDS",
  defaultIconId: "aws-rds",
  supportedAttributes: ["engine", "instance_class", "allocated_storage", "db_name", "vpc_security_group_ids"],
  relationshipAttributes: ["db_subnet_group_name", "vpc_security_group_ids"],
  securityAttributes: ["storage_encrypted", "publicly_accessible"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_rds_cluster",
  provider: "aws",
  category: "database",
  technology: "Aurora RDS Cluster",
  providerService: "Amazon Aurora",
  defaultIconId: "aws-aurora",
  supportedAttributes: ["engine", "database_name", "master_username"],
  relationshipAttributes: ["db_subnet_group_name", "vpc_security_group_ids"],
  securityAttributes: ["storage_encrypted"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_dynamodb_table",
  provider: "aws",
  category: "database",
  technology: "DynamoDB",
  providerService: "Amazon DynamoDB",
  defaultIconId: "aws-dynamodb",
  supportedAttributes: ["name", "hash_key", "billing_mode"],
  relationshipAttributes: [],
  securityAttributes: ["server_side_encryption"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_s3_bucket",
  provider: "aws",
  category: "storage",
  technology: "S3 Bucket",
  providerService: "Amazon S3",
  defaultIconId: "aws-s3",
  supportedAttributes: ["bucket"],
  relationshipAttributes: [],
  securityAttributes: ["server_side_encryption_configuration"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_elasticache_cluster",
  provider: "aws",
  category: "cache",
  technology: "ElastiCache Redis",
  providerService: "Amazon ElastiCache",
  defaultIconId: "aws-elasticache",
  supportedAttributes: ["engine", "node_type", "num_cache_nodes"],
  relationshipAttributes: ["security_group_ids", "subnet_group_name"],
  securityAttributes: [],
  supportLevel: "supported",
});

// --- AWS Messaging ---
registerMapping({
  resourceType: "aws_sqs_queue",
  provider: "aws",
  category: "queue",
  technology: "SQS Queue",
  providerService: "Amazon SQS",
  defaultIconId: "aws-sqs",
  supportedAttributes: ["name", "delay_seconds", "redrive_policy"],
  relationshipAttributes: [],
  securityAttributes: ["kms_master_key_id"],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "aws_sns_topic",
  provider: "aws",
  category: "queue",
  technology: "SNS Topic",
  providerService: "Amazon SNS",
  defaultIconId: "aws-sns",
  supportedAttributes: ["name"],
  relationshipAttributes: [],
  securityAttributes: ["kms_master_key_id"],
  supportLevel: "supported",
});

// --- GCP Compute & Networking & Data ---
registerMapping({
  resourceType: "google_compute_network",
  provider: "gcp",
  category: "network",
  technology: "VPC Network",
  providerService: "Google Cloud VPC",
  defaultIconId: "gcp-vpc",
  supportedAttributes: ["name", "auto_create_subnetworks"],
  relationshipAttributes: [],
  securityAttributes: [],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "google_cloud_run_service",
  provider: "gcp",
  category: "compute",
  technology: "Cloud Run",
  providerService: "Google Cloud Run",
  defaultIconId: "gcp-cloud-run",
  supportedAttributes: ["name", "location", "template"],
  relationshipAttributes: [],
  securityAttributes: [],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "google_sql_database_instance",
  provider: "gcp",
  category: "database",
  technology: "Cloud SQL",
  providerService: "Google Cloud SQL",
  defaultIconId: "gcp-cloud-sql",
  supportedAttributes: ["name", "database_version", "settings"],
  relationshipAttributes: [],
  securityAttributes: [],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "google_storage_bucket",
  provider: "gcp",
  category: "storage",
  technology: "Cloud Storage",
  providerService: "Google Cloud Storage",
  defaultIconId: "gcp-storage",
  supportedAttributes: ["name", "location"],
  relationshipAttributes: [],
  securityAttributes: [],
  supportLevel: "supported",
});

registerMapping({
  resourceType: "google_pubsub_topic",
  provider: "gcp",
  category: "queue",
  technology: "Pub/Sub Topic",
  providerService: "Google Cloud Pub/Sub",
  defaultIconId: "gcp-pubsub",
  supportedAttributes: ["name"],
  relationshipAttributes: [],
  securityAttributes: [],
  supportLevel: "supported",
});

/**
 * Looks up a Terraform resource type in the catalog.
 * Returns a fallback generic resource mapping for unknown resources.
 */
export function lookupTerraformCatalog(resourceType: string): CatalogResourceMapping {
  const existing = RESOURCE_CATALOG.get(resourceType);
  if (existing) {
    return existing;
  }

  const provider = resourceType.startsWith("aws_") 
    ? "aws" 
    : resourceType.startsWith("google_") || resourceType.startsWith("gcp_")
    ? "gcp"
    : resourceType.startsWith("azurerm_")
    ? "azure"
    : "generic";

  return {
    resourceType,
    provider,
    category: "unknown",
    technology: resourceType,
    providerService: `${provider.toUpperCase()} Infrastructure`,
    defaultIconId: `${provider}-generic`,
    supportedAttributes: [],
    relationshipAttributes: [],
    securityAttributes: [],
    supportLevel: "generic",
  };
}
