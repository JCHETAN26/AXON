import { describe, it, expect } from "vitest";
import { extractTerraform } from "./terraform";

describe("extractTerraform", () => {
  it("extracts common AWS resources", () => {
    const text = `
resource "aws_db_instance" "default" {
  allocated_storage    = 10
  engine               = "mysql"
  instance_class       = "db.t3.micro"
}

resource "aws_s3_bucket" "b" {
  bucket = "my-tf-test-bucket"
}
    `;

    const evidence = extractTerraform("main.tf", text);
    expect(evidence).toHaveLength(2);
    expect(evidence[0]?.fact.category).toBe("database");
    expect(evidence[1]?.fact.category).toBe("storage");
  });
});
