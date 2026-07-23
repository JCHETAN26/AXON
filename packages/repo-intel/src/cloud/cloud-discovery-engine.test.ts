import { describe, it, expect } from "vitest";
import { reconcileCloudAssets, type RawCloudAssetInput } from "./cloud-discovery-engine";

describe("cloud-discovery-engine", () => {
  it("normalizes live assets and identifies matched vs unmanaged resources", () => {
    const rawInputs: RawCloudAssetInput[] = [
      {
        provider: "aws",
        resourceType: "aws_db_instance",
        name: "production-postgres",
        region: "us-east-1",
        accountOrProjectId: "123456789012",
      },
      {
        provider: "aws",
        resourceType: "aws_instance",
        name: "shadow-bastion-vm",
        region: "us-east-1",
        accountOrProjectId: "123456789012",
      },
    ];

    const declaredIacNames = ["production-postgres", "analytics-queue"];

    const result = reconcileCloudAssets(rawInputs, declaredIacNames);

    expect(result.summary.totalDiscovered).toBe(2);
    expect(result.summary.matchedCount).toBe(1);
    expect(result.summary.unmanagedCount).toBe(1);
    expect(result.summary.missingCount).toBe(1);

    const dbAsset = result.assets.find((a) => a.name === "production-postgres");
    expect(dbAsset?.reconciliationStatus).toBe("matched");

    const shadowAsset = result.assets.find((a) => a.name === "shadow-bastion-vm");
    expect(shadowAsset?.reconciliationStatus).toBe("unmanaged");
  });
});
