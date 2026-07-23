import { describe, it, expect } from "vitest";
import { parseHcl, sanitizeHclValue, extractHclReferences } from "./hcl-parser";

describe("hcl-parser", () => {
  it("sanitizes sensitive attributes", () => {
    expect(sanitizeHclValue("password", "supersecret123")).toBe("[REDACTED_SECRET_VALUE]");
    expect(sanitizeHclValue("api_key", "sk-123456")).toBe("[REDACTED_SECRET_VALUE]");
    expect(sanitizeHclValue("db_name", "production_db")).toBe("production_db");
  });

  it("extracts static HCL references", () => {
    const refs = extractHclReferences("module.network.private_subnet_ids[count.index]");
    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetType: "module", targetName: "network" }),
        expect.objectContaining({ targetType: "count" }),
      ])
    );
  });

  it("parses terraform HCL blocks accurately without evaluation", () => {
    const hclContent = `
      resource "aws_db_instance" "postgres" {
        allocated_storage    = 20
        engine               = "postgres"
        instance_class       = "db.t3.micro"
        db_name              = "mydb"
        password             = "secret123"
        subnet_id            = module.network.private_subnet_ids[count.index]
      }
    `;

    const result = parseHcl("main.tf", hclContent);

    expect(result.success).toBe(true);
    expect(result.blocks).toHaveLength(1);

    const resourceBlock = result.blocks[0];
    expect(resourceBlock).toBeDefined();
    if (!resourceBlock) return;
    expect(resourceBlock.blockType).toBe("resource");
    expect(resourceBlock.labels).toEqual(["aws_db_instance", "postgres"]);

    const passwordAttr = resourceBlock.attributes.get("password");
    expect(passwordAttr?.rawValue).toBe("[REDACTED_SECRET_VALUE]");

    const subnetAttr = resourceBlock.attributes.get("subnet_id");
    expect(subnetAttr?.isUnresolved).toBe(true);
  });
});
