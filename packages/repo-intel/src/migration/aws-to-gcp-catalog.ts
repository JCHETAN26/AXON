export interface AwsToGcpMapping {
  awsTechnology: string;
  gcpTechnology: string;
  gcpCategory: string;
  gcpProductName: string;
  equivalenceScore: number; // 1.0 = direct, 0.8 = near, 0.5 = partial
  refactoringNotes?: string;
}

export const MIGRATION_CATALOG_VERSION = "1.0.0";

const MAPPINGS: AwsToGcpMapping[] = [
  {
    awsTechnology: "aws_instance",
    gcpTechnology: "google_compute_instance",
    gcpCategory: "compute",
    gcpProductName: "Google Compute Engine",
    equivalenceScore: 1.0,
    refactoringNotes: "Direct Virtual Machine equivalent. Migrate instance types and startup scripts.",
  },
  {
    awsTechnology: "aws_ecs_service",
    gcpTechnology: "google_cloud_run_service",
    gcpCategory: "compute",
    gcpProductName: "Google Cloud Run",
    equivalenceScore: 0.9,
    refactoringNotes: "Container workload equivalent. Stateless HTTP services map cleanly to Cloud Run.",
  },
  {
    awsTechnology: "aws_eks_cluster",
    gcpTechnology: "google_container_cluster",
    gcpCategory: "compute",
    gcpProductName: "Google Kubernetes Engine (GKE)",
    equivalenceScore: 1.0,
    refactoringNotes: "Managed Kubernetes equivalent. Migrate manifests and node pools directly.",
  },
  {
    awsTechnology: "aws_db_instance",
    gcpTechnology: "google_sql_database_instance",
    gcpCategory: "database",
    gcpProductName: "Google Cloud SQL",
    equivalenceScore: 1.0,
    refactoringNotes: "Fully-managed relational database supporting PostgreSQL and MySQL.",
  },
  {
    awsTechnology: "aws_dynamodb_table",
    gcpTechnology: "google_firestore_database",
    gcpCategory: "database",
    gcpProductName: "Google Cloud Firestore",
    equivalenceScore: 0.8,
    refactoringNotes: "Document/NoSQL database equivalent. Review index definitions and query patterns.",
  },
  {
    awsTechnology: "aws_s3_bucket",
    gcpTechnology: "google_storage_bucket",
    gcpCategory: "storage",
    gcpProductName: "Google Cloud Storage",
    equivalenceScore: 1.0,
    refactoringNotes: "Direct object storage equivalent with unified bucket naming and IAM access rules.",
  },
  {
    awsTechnology: "aws_sqs_queue",
    gcpTechnology: "google_pubsub_topic",
    gcpCategory: "queue",
    gcpProductName: "Google Cloud Pub/Sub",
    equivalenceScore: 0.9,
    refactoringNotes: "Asynchronous messaging. Pub/Sub uses topic-subscription model.",
  },
  {
    awsTechnology: "aws_sns_topic",
    gcpTechnology: "google_pubsub_topic",
    gcpCategory: "queue",
    gcpProductName: "Google Cloud Pub/Sub",
    equivalenceScore: 1.0,
    refactoringNotes: "Publish-subscribe event topic equivalent.",
  },
  {
    awsTechnology: "aws_elasticache_cluster",
    gcpTechnology: "google_memorystore_instance",
    gcpCategory: "cache",
    gcpProductName: "Google Cloud Memorystore",
    equivalenceScore: 1.0,
    refactoringNotes: "Managed Redis / Memcached in-memory data store equivalent.",
  },
  {
    awsTechnology: "aws_lb",
    gcpTechnology: "google_compute_global_forwarding_rule",
    gcpCategory: "network",
    gcpProductName: "Google Cloud Load Balancing",
    equivalenceScore: 0.9,
    refactoringNotes: "Global HTTP(S) and Network Load Balancing equivalent.",
  },
  {
    awsTechnology: "aws_lambda_function",
    gcpTechnology: "google_cloudfunctions_function",
    gcpCategory: "compute",
    gcpProductName: "Google Cloud Functions",
    equivalenceScore: 0.9,
    refactoringNotes: "Event-driven serverless FaaS. Review execution timeouts and environment variables.",
  },
  {
    awsTechnology: "aws_vpc",
    gcpTechnology: "google_compute_network",
    gcpCategory: "network",
    gcpProductName: "Google Cloud VPC Network",
    equivalenceScore: 1.0,
    refactoringNotes: "Global Virtual Private Cloud network equivalent.",
  },
];

const MAPPING_MAP = new Map<string, AwsToGcpMapping>(
  MAPPINGS.map((m) => [m.awsTechnology.toLowerCase(), m])
);

export function getAwsToGcpMapping(awsTech: string): AwsToGcpMapping | null {
  const normalized = awsTech.toLowerCase();
  return MAPPING_MAP.get(normalized) ?? null;
}
