import { z } from "zod";

export const PROJECT_SCHEMA_VERSION = "1.0";

const nonEmptyString = z.string().min(1);
const isoDateTime = z.iso.datetime();

/** A user project. Its architecture lives in a separate ArchitectureDocument. */
export const ProjectSchema = z.object({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  id: nonEmptyString,
  name: nonEmptyString,
  description: z.string().optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  architectureDocumentId: nonEmptyString,
});

export type Project = z.infer<typeof ProjectSchema>;

export function parseProject(input: unknown): Project {
  return ProjectSchema.parse(input);
}

export function safeParseProject(input: unknown) {
  return ProjectSchema.safeParse(input);
}
