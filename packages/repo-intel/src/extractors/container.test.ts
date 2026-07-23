import { describe, it, expect } from "vitest";
import { extractDockerfile, extractCompose } from "./container";

describe("extractDockerfile", () => {
  it("extracts from node base image", () => {
    const dockerfile = `
FROM node:18-alpine AS builder
RUN npm install
CMD ["npm", "start"]
    `;
    const evidence = extractDockerfile("Dockerfile", dockerfile);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.fact.technology).toBe("Node.js");
  });
});

describe("extractCompose", () => {
  it("extracts services from docker-compose.yml", () => {
    const compose = `
services:
  web:
    build: .
    ports:
      - "3000:3000"
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: \${DB_PASS}
  redis:
    image: redis:alpine
`;
    const evidence = extractCompose("docker-compose.yml", compose);
    expect(evidence).toHaveLength(3); // web, db, redis
    
    const dbEvidence = evidence.find(e => e.fact.detail === "db");
    expect(dbEvidence?.fact.technology).toBe("PostgreSQL");

    const redisEvidence = evidence.find(e => e.fact.detail === "redis");
    expect(redisEvidence?.fact.technology).toBe("Redis");
  });
});
