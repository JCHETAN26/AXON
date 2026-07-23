import { z } from "zod";

import { type GroundedCopilotAnswer } from "./grounding";

export const COPILOT_STATE_SCHEMA_VERSION = "1.0";

const isoDateTime = z.iso.datetime();

const CopilotCitationSchema = z.object({
  kind: z.enum([
    "component",
    "relationship",
    "finding",
    "cost-estimate",
    "migration-mapping",
    "simulation",
  ]),
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
});

export const CopilotAnswerSchema = z.object({
  directAnswer: z.string(),
  citations: z.array(CopilotCitationSchema),
  assumptions: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low", "insufficient"]),
  missingInformation: z.array(z.string()),
  limitations: z.array(z.string()),
  suggestedAction: z.string(),
});

export const CopilotExchangeSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: CopilotAnswerSchema,
  askedAt: isoDateTime,
  documentUpdatedAtAtAnswer: isoDateTime,
});

export const CopilotStateSchema = z.object({
  schemaVersion: z.literal(COPILOT_STATE_SCHEMA_VERSION),
  projectId: z.string().min(1),
  documentId: z.string().min(1),
  exchanges: z.array(CopilotExchangeSchema).max(50),
});

export type CopilotExchange = z.infer<typeof CopilotExchangeSchema>;
export type CopilotState = z.infer<typeof CopilotStateSchema>;

export function parseCopilotState(input: unknown): CopilotState {
  return CopilotStateSchema.parse(input);
}

export function safeParseCopilotState(input: unknown) {
  return CopilotStateSchema.safeParse(input);
}

export function buildCopilotExchange(input: {
  readonly question: string;
  readonly answer: GroundedCopilotAnswer;
  readonly askedAt: string;
  readonly documentUpdatedAtAtAnswer: string;
}): CopilotExchange {
  return {
    id: `copilot-${input.askedAt}`,
    question: input.question,
    answer: {
      ...input.answer,
      citations: [...input.answer.citations],
      assumptions: [...input.answer.assumptions],
      missingInformation: [...input.answer.missingInformation],
      limitations: [...input.answer.limitations],
    },
    askedAt: input.askedAt,
    documentUpdatedAtAtAnswer: input.documentUpdatedAtAtAnswer,
  };
}
