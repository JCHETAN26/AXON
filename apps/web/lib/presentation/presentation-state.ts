import { z } from "zod";

export const PRESENTATION_STATE_SCHEMA_VERSION = "1.0";

export const PresentationStateSchema = z.object({
  schemaVersion: z.literal(PRESENTATION_STATE_SCHEMA_VERSION),
  projectId: z.string().min(1),
  documentId: z.string().min(1),
  speakerNotesByStepId: z.record(z.string().min(1), z.string().max(2000)),
  updatedAt: z.iso.datetime(),
});

export type PresentationState = z.infer<typeof PresentationStateSchema>;

export function safeParsePresentationState(input: unknown) {
  return PresentationStateSchema.safeParse(input);
}
