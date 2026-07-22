import { describe, expect, it } from "vitest";

import { PersistenceConfigError, resolvePersistenceMode } from "./persistence-mode";

const CLOUD_ENV = {
  AXON_PERSISTENCE_MODE: "cloud",
  DATABASE_URL: "postgres://localhost:5432/axon",
  AUTH_SECRET: "s3cret",
};

describe("resolvePersistenceMode", () => {
  it("defaults to local outside production when unset", () => {
    expect(resolvePersistenceMode({ NODE_ENV: "development" })).toBe("local");
    expect(resolvePersistenceMode({ NODE_ENV: "test" })).toBe("local");
  });

  it("FAILS CLOSED in production when unset — no silent local fallback", () => {
    expect(() => resolvePersistenceMode({ NODE_ENV: "production" })).toThrow(
      PersistenceConfigError,
    );
  });

  it("does not fall back to local just because DATABASE_URL is absent in production", () => {
    // The historical defect: production + missing DB config → anonymous local.
    expect(() =>
      resolvePersistenceMode({ NODE_ENV: "production", AXON_PERSISTENCE_MODE: "cloud" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("honours an explicit local mode in any environment", () => {
    expect(resolvePersistenceMode({ NODE_ENV: "production", AXON_PERSISTENCE_MODE: "local" })).toBe(
      "local",
    );
  });

  it("accepts cloud mode when its required configuration is present", () => {
    expect(resolvePersistenceMode({ NODE_ENV: "production", ...CLOUD_ENV })).toBe("cloud");
  });

  it("fails closed when cloud mode is missing AUTH_SECRET", () => {
    expect(() =>
      resolvePersistenceMode({
        NODE_ENV: "production",
        AXON_PERSISTENCE_MODE: "cloud",
        DATABASE_URL: "postgres://localhost/axon",
      }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("rejects an unrecognised mode value", () => {
    expect(() => resolvePersistenceMode({ AXON_PERSISTENCE_MODE: "hybrid" })).toThrow(
      PersistenceConfigError,
    );
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolvePersistenceMode({ AXON_PERSISTENCE_MODE: "  Local " })).toBe("local");
  });
});
