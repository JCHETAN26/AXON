import { ComposeImportError } from "./errors";
import { IMPORT_LIMITS } from "./limits";
import {
  type ComposeDependency,
  type ComposePort,
  type ComposeResource,
  type ComposeService,
  type ParsedComposeModel,
} from "./types";
import { type WarningCollector } from "./warnings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Keys of a Compose mapping-or-sequence, e.g. networks/volumes on a service. */
function readNameList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (isRecord(value)) {
    return Object.keys(value);
  }
  return [];
}

function hasInterpolation(value: unknown): boolean {
  return typeof value === "string" && /\$\{[^}]+\}|\$[A-Za-z_]/.test(value);
}

function readEnvironmentKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.split("=")[0] ?? item);
  }
  if (isRecord(value)) {
    return Object.keys(value);
  }
  return [];
}

function parsePort(raw: unknown): ComposePort | null {
  if (typeof raw === "number") {
    return { target: String(raw), raw: String(raw) };
  }
  if (typeof raw === "string") {
    // Forms: "8080", "8080:80", "127.0.0.1:8080:80", "80/udp".
    const [hostAndPorts, protocol] = raw.split("/");
    const parts = (hostAndPorts ?? "").split(":");
    const target = parts[parts.length - 1] ?? raw;
    const published = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    return {
      target,
      ...(published !== undefined && { published }),
      ...(protocol !== undefined && { protocol }),
      raw,
    };
  }
  if (isRecord(raw)) {
    const target = raw["target"];
    const published = raw["published"];
    const protocol = raw["protocol"];
    return {
      target: target === undefined ? "?" : String(target),
      ...(published !== undefined && { published: String(published) }),
      ...(typeof protocol === "string" && { protocol }),
      raw: JSON.stringify(raw),
    };
  }
  return null;
}

/** Distinguishes named-volume references from host-path bind mounts. */
function readServiceVolumes(
  value: unknown,
  serviceName: string,
  warnings: WarningCollector,
): string[] {
  const named: string[] = [];
  const entries = Array.isArray(value) ? value : [];
  for (const entry of entries) {
    if (typeof entry === "string") {
      const source = entry.split(":")[0] ?? entry;
      // A bind mount starts with . or / or ~ — a host path AXON must not read.
      if (source.startsWith(".") || source.startsWith("/") || source.startsWith("~")) {
        warnings.unsupported(
          "host-mount",
          `services.${serviceName}`,
          `Detected a host filesystem mount ("${source}").`,
          "The host path is not read or inspected; storage is represented only as a note.",
        );
      } else {
        named.push(source);
      }
    } else if (isRecord(entry)) {
      const source = entry["source"];
      const type = entry["type"];
      if (type === "bind") {
        warnings.unsupported(
          "host-mount",
          `services.${serviceName}`,
          "Detected a bind mount.",
          "The host path is not read or inspected.",
        );
      } else if (typeof source === "string") {
        named.push(source);
      }
    }
  }
  return named;
}

function detectServiceWarnings(
  name: string,
  service: Record<string, unknown>,
  warnings: WarningCollector,
): void {
  const target = `services.${name}`;
  if ("build" in service) {
    warnings.unsupported(
      "build-context",
      target,
      "Detected a build section.",
      "The build context and Dockerfile are not inspected; the image role is inferred from name and configuration only.",
    );
  }
  if ("env_file" in service) {
    warnings.unsupported(
      "env-file",
      target,
      "Detected an env_file reference.",
      "Referenced env files are not read; environment values are treated as unresolved.",
    );
  }
  if ("extends" in service) {
    warnings.unsupported(
      "extends",
      target,
      "Detected an extends directive.",
      "Extension across files is not resolved; only the inline definition is imported.",
    );
  }
  if ("secrets" in service || "configs" in service) {
    warnings.review(
      "secret-config-ref",
      target,
      "Detected secret or config references.",
      "Referenced secret and config file contents are never read; only their names are noted.",
    );
  }
  if ("deploy" in service) {
    warnings.info(
      "deploy-block",
      target,
      "Detected a deploy/swarm block.",
      "Swarm deployment settings are not executed and do not affect the imported architecture.",
    );
  }
  for (const [key, value] of Object.entries(service)) {
    if (hasInterpolation(value)) {
      warnings.review(
        "interpolation",
        target,
        `Detected variable interpolation in "${key}".`,
        "Environment interpolation is not resolved; the literal reference is kept.",
      );
      break;
    }
  }
}

/**
 * Normalizes a parsed Compose object into the structured model, collecting a
 * warning for every unsupported or unresolved feature. Never reads files,
 * resolves URLs, or interpolates environment values.
 */
export function normalizeCompose(root: unknown, warnings: WarningCollector): ParsedComposeModel {
  if (!isRecord(root)) {
    throw new ComposeImportError(
      "not-an-object",
      "The top level of the document is not a mapping.",
    );
  }

  if ("include" in root) {
    warnings.unsupported(
      "include",
      "include",
      "Detected an include directive.",
      "Included Compose files are not loaded; only this document is imported.",
    );
  }

  const composeVersion = typeof root["version"] === "string" ? root["version"] : undefined;

  const servicesRaw = root["services"];
  if (!isRecord(servicesRaw)) {
    throw new ComposeImportError("no-services", "The document defines no services mapping.");
  }
  const serviceNames = Object.keys(servicesRaw);
  if (serviceNames.length === 0) {
    throw new ComposeImportError("no-services", "The document defines no services.");
  }
  if (serviceNames.length > IMPORT_LIMITS.maxServices) {
    throw new ComposeImportError(
      "limit-exceeded",
      `Document defines more than ${String(IMPORT_LIMITS.maxServices)} services.`,
    );
  }

  const services: ComposeService[] = [];
  const dependencies: ComposeDependency[] = [];

  for (const name of serviceNames) {
    const raw = servicesRaw[name];
    if (!isRecord(raw)) {
      warnings.review(
        "empty-service",
        `services.${name}`,
        "Service has no definition mapping.",
        "The service is imported as an unclassified component requiring review.",
      );
    }
    const service = isRecord(raw) ? raw : {};
    detectServiceWarnings(name, service, warnings);

    const ports = Array.isArray(service["ports"])
      ? service["ports"].map(parsePort).filter((port): port is ComposePort => port !== null)
      : [];
    const dependsOn = readNameList(service["depends_on"]);
    const links = readNameList(service["links"]).map((link) => link.split(":")[0] ?? link);

    for (const to of dependsOn) {
      dependencies.push({ from: name, to, source: "depends_on" });
    }
    for (const to of links) {
      dependencies.push({ from: name, to, source: "links" });
    }

    services.push({
      name,
      ...(typeof service["image"] === "string" && { image: service["image"] }),
      hasBuild: "build" in service,
      ports,
      networks: readNameList(service["networks"]),
      namedVolumes: readServiceVolumes(service["volumes"], name, warnings),
      dependsOn,
      links,
      environmentKeys: readEnvironmentKeys(service["environment"]),
      ...(typeof service["restart"] === "string" && { restart: service["restart"] }),
    });
  }

  if (dependencies.length > IMPORT_LIMITS.maxDependencies) {
    throw new ComposeImportError(
      "limit-exceeded",
      `Document defines more than ${String(IMPORT_LIMITS.maxDependencies)} dependencies.`,
    );
  }

  return {
    services,
    networks: readResources(root["networks"], "networks", IMPORT_LIMITS.maxNetworks, warnings),
    volumes: readResources(root["volumes"], "volumes", IMPORT_LIMITS.maxVolumes, warnings),
    configs: readResources(root["configs"], "configs", IMPORT_LIMITS.maxConfigs, warnings),
    secrets: readResources(root["secrets"], "secrets", IMPORT_LIMITS.maxSecrets, warnings),
    dependencies,
    ...(composeVersion !== undefined && { composeVersion }),
  };
}

function readResources(
  value: unknown,
  kind: string,
  limit: number,
  warnings: WarningCollector,
): ComposeResource[] {
  if (!isRecord(value)) return [];
  const names = Object.keys(value);
  if (names.length > limit) {
    throw new ComposeImportError(
      "limit-exceeded",
      `Document defines more than ${String(limit)} ${kind}.`,
    );
  }
  return names.map((name) => {
    const definition = value[name];
    const external = isRecord(definition) && definition["external"] === true;
    if (external) {
      warnings.review(
        "external-resource",
        `${kind}.${name}`,
        `Detected an external ${kind.slice(0, -1)} ("${name}").`,
        "External resources are declared elsewhere and are not resolved during import.",
      );
    }
    if (
      (kind === "secrets" || kind === "configs") &&
      isRecord(definition) &&
      "file" in definition
    ) {
      warnings.review(
        "resource-file",
        `${kind}.${name}`,
        `Detected a file-backed ${kind.slice(0, -1)} ("${name}").`,
        "The referenced file contents are never read.",
      );
    }
    return { name, external };
  });
}
