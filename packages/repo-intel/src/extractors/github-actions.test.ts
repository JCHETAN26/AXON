import { describe, it, expect } from "vitest";
import { extractGithubActions } from "./github-actions";

describe("extractGithubActions", () => {
  it("extracts cloud credentials and environments from yaml", () => {
    const yaml = `
name: Deploy
jobs:
  deploy:
    environment: production
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/configure-aws-credentials@v4
      - run: echo \${{ secrets.AWS_ACCESS_KEY_ID }}
`;
    const evidence = extractGithubActions(".github/workflows/deploy.yml", yaml);
    
    expect(evidence).toHaveLength(3);
    
    const envEvidence = evidence.find(e => e.evidenceType === "ci-deploy-target");
    expect(envEvidence).toBeDefined();
    expect(envEvidence?.fact.name).toBe("production");

    const authEvidence = evidence.find(e => e.evidenceType === "ci-step");
    expect(authEvidence).toBeDefined();
    expect(authEvidence?.fact.technology).toBe("AWS");

    const secretEvidence = evidence.find(e => e.evidenceType === "secret-reference");
    expect(secretEvidence).toBeDefined();
    expect(secretEvidence?.fact.name).toBe("AWS_ACCESS_KEY_ID");
  });
});
