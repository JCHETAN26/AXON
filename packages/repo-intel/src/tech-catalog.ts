/**
 * Maps dependency / import names to a canonical technology and architecture
 * category. Deliberately conservative: a name maps to a technology only when the
 * mapping is unambiguous. A dependency listing is weak evidence on its own — the
 * catalog says *what* a name refers to, not that the service is actively used.
 */

export interface TechEntry {
  readonly technology: string;
  readonly category: string;
}

/** Keys are lower-cased dependency / module names (npm, PyPI, Go, etc.). */
export const TECH_CATALOG: Record<string, TechEntry> = {
  // --- Databases ---
  pg: { technology: "PostgreSQL", category: "database" },
  "pg-promise": { technology: "PostgreSQL", category: "database" },
  postgres: { technology: "PostgreSQL", category: "database" },
  psycopg2: { technology: "PostgreSQL", category: "database" },
  "psycopg2-binary": { technology: "PostgreSQL", category: "database" },
  psycopg: { technology: "PostgreSQL", category: "database" },
  asyncpg: { technology: "PostgreSQL", category: "database" },
  "github.com/lib/pq": { technology: "PostgreSQL", category: "database" },
  "github.com/jackc/pgx/v5": { technology: "PostgreSQL", category: "database" },
  mysql: { technology: "MySQL", category: "database" },
  mysql2: { technology: "MySQL", category: "database" },
  pymysql: { technology: "MySQL", category: "database" },
  mongodb: { technology: "MongoDB", category: "database" },
  mongoose: { technology: "MongoDB", category: "database" },
  pymongo: { technology: "MongoDB", category: "database" },
  prisma: { technology: "Prisma", category: "database" },
  "drizzle-orm": { technology: "Drizzle ORM", category: "database" },
  sqlalchemy: { technology: "SQLAlchemy", category: "database" },
  // --- Cache ---
  redis: { technology: "Redis", category: "cache" },
  ioredis: { technology: "Redis", category: "cache" },
  "redis-py": { technology: "Redis", category: "cache" },
  memcached: { technology: "Memcached", category: "cache" },
  // --- Queues / streaming ---
  amqplib: { technology: "RabbitMQ", category: "queue" },
  pika: { technology: "RabbitMQ", category: "queue" },
  kafkajs: { technology: "Kafka", category: "queue" },
  "kafka-python": { technology: "Kafka", category: "queue" },
  "@aws-sdk/client-sqs": { technology: "AWS SQS", category: "queue" },
  "@google-cloud/pubsub": { technology: "Google Pub/Sub", category: "queue" },
  bullmq: { technology: "BullMQ", category: "queue" },
  celery: { technology: "Celery", category: "queue" },
  // --- Web frameworks / services ---
  express: { technology: "Express", category: "service" },
  fastify: { technology: "Fastify", category: "service" },
  koa: { technology: "Koa", category: "service" },
  next: { technology: "Next.js", category: "service" },
  "@nestjs/core": { technology: "NestJS", category: "service" },
  flask: { technology: "Flask", category: "service" },
  django: { technology: "Django", category: "service" },
  fastapi: { technology: "FastAPI", category: "service" },
  "github.com/gin-gonic/gin": { technology: "Gin", category: "service" },
  // --- Cloud SDKs / storage ---
  "aws-sdk": { technology: "AWS", category: "cloud" },
  "@aws-sdk/client-s3": { technology: "AWS S3", category: "storage" },
  boto3: { technology: "AWS", category: "cloud" },
  "@google-cloud/storage": { technology: "Google Cloud Storage", category: "storage" },
  "@azure/storage-blob": { technology: "Azure Blob Storage", category: "storage" },
  node: { technology: "Node.js", category: "service" },
  python: { technology: "Python", category: "service" },
  ruby: { technology: "Ruby", category: "service" },
  // --- Observability ---
  "@opentelemetry/api": { technology: "OpenTelemetry", category: "observability" },
  "@opentelemetry/sdk-node": { technology: "OpenTelemetry", category: "observability" },
  "opentelemetry-api": { technology: "OpenTelemetry", category: "observability" },
  "prom-client": { technology: "Prometheus", category: "observability" },
  prometheus_client: { technology: "Prometheus", category: "observability" },
  // --- AI providers ---
  "@anthropic-ai/sdk": { technology: "Anthropic", category: "ai-provider" },
  anthropic: { technology: "Anthropic", category: "ai-provider" },
  openai: { technology: "OpenAI", category: "ai-provider" },
  // --- Auth ---
  "next-auth": { technology: "Auth.js", category: "auth" },
  passport: { technology: "Passport", category: "auth" },
  jsonwebtoken: { technology: "JWT", category: "auth" },
  // --- Payments ---
  stripe: { technology: "Stripe", category: "payment" },
  // --- HTTP clients ---
  axios: { technology: "HTTP client", category: "http-client" },
  "node-fetch": { technology: "HTTP client", category: "http-client" },
  got: { technology: "HTTP client", category: "http-client" },
  requests: { technology: "HTTP client", category: "http-client" },
  httpx: { technology: "HTTP client", category: "http-client" },
};

/** Looks up a dependency/module name (case-insensitively). */
export function lookupTech(name: string): TechEntry | undefined {
  return TECH_CATALOG[name] ?? TECH_CATALOG[name.toLowerCase()];
}
