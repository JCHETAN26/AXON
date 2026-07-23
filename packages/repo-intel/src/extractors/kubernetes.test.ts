import { describe, it, expect } from "vitest";
import { extractKubernetes } from "./kubernetes";

describe("extractKubernetes", () => {
  it("extracts deployments and services", () => {
    const text = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
---
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - port: 80
    `;

    const evidence = extractKubernetes("manifest.yml", text);
    expect(evidence).toHaveLength(2);
    expect(evidence[0]?.fact.category).toBe("compute");
    expect(evidence[1]?.fact.category).toBe("network");
  });
});
