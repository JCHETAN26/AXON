"use client";

import { type ProjectAuditState } from "@axon/architecture-audit";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge, cx } from "@axon/ui";
import { useEffect, useState } from "react";

import { answerGroundedArchitectureQuestion } from "@/lib/copilot/grounding";
import {
  buildCopilotExchange,
  COPILOT_STATE_SCHEMA_VERSION,
  type CopilotExchange,
  type CopilotState,
} from "@/lib/copilot/copilot-state";
import { getCopilotRepository } from "@/lib/copilot/get-copilot-repository";

export interface CopilotWorkspaceProps {
  document: ArchitectureDocument;
  auditState: ProjectAuditState | null;
}

function confidenceKind(confidence: CopilotExchange["answer"]["confidence"]) {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "info";
  if (confidence === "low") return "warning";
  return "neutral";
}

export function CopilotWorkspace({ document, auditState }: CopilotWorkspaceProps) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<CopilotState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void getCopilotRepository()
      .getCopilotState(document.projectId)
      .then((stored) => {
        if (!cancelled) {
          setState(stored);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [document.projectId]);

  const askQuestion = async () => {
    const trimmed = question.trim();
    if (trimmed.length === 0) return;

    const now = new Date().toISOString();
    const answer = answerGroundedArchitectureQuestion(trimmed, {
      document,
      findings: auditState?.findings ?? [],
    });
    const exchange = buildCopilotExchange({
      question: trimmed,
      answer,
      askedAt: now,
      documentUpdatedAtAtAnswer: document.updatedAt,
    });
    const next: CopilotState = {
      schemaVersion: COPILOT_STATE_SCHEMA_VERSION,
      projectId: document.projectId,
      documentId: document.id,
      exchanges: [exchange, ...(state?.exchanges ?? [])].slice(0, 50),
    };

    setStatus("saving");
    try {
      await getCopilotRepository().saveCopilotState(next);
      setState(next);
      setQuestion("");
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  const exchanges = state?.exchanges ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-border-strong bg-surface p-4">
        <div>
          <h2 className="type-headline-md">Architecture Copilot</h2>
          <p className="type-body-md mt-2 text-foreground-muted">
            Deterministic answers from the current architecture document and audit findings. No
            model provider is called in this build.
          </p>
        </div>
        <StatusBadge kind={status === "error" ? "warning" : "info"}>
          {status === "saving" ? "SAVING" : `${exchanges.length} SAVED`}
        </StatusBadge>
      </div>

      <form
        className="flex flex-col gap-3 border-2 border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void askQuestion();
        }}
      >
        <label htmlFor="copilot-question" className="type-label-caps text-foreground-muted">
          Ask a grounded question
        </label>
        <textarea
          id="copilot-question"
          className="min-h-24 border-2 border-border bg-surface p-3 type-body-md text-foreground"
          value={question}
          onChange={(event) => {
            setQuestion(event.currentTarget.value);
          }}
          placeholder="What database do we use?"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cx("type-mono-data", status === "error" ? "text-warning" : "text-foreground-muted")}>
            {status === "error"
              ? "COPILOT_SAVE_FAILED"
              : "GROUNDING_ONLY · architecture document + current audit context"}
          </p>
          <Button type="submit" variant="primary" size="sm" disabled={question.trim().length === 0}>
            Ask Copilot
          </Button>
        </div>
      </form>

      {exchanges.length === 0 ? (
        <div className="border-2 border-dashed border-border-strong p-8">
          <p className="type-body-lg">No copilot questions yet.</p>
          <p className="type-body-md mt-2 text-foreground-muted">
            Ask about represented components or current audit findings. Questions without grounded
            context are refused rather than guessed.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {exchanges.map((exchange) => (
            <li key={exchange.id} className="border-2 border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="type-body-md font-semibold text-foreground">{exchange.question}</p>
                <StatusBadge kind={confidenceKind(exchange.answer.confidence)}>
                  {exchange.answer.confidence.toUpperCase()}
                </StatusBadge>
              </div>
              <p className="type-body-md mt-3 text-foreground">{exchange.answer.directAnswer}</p>
              {exchange.answer.citations.length > 0 ? (
                <div className="mt-4">
                  <p className="type-label-caps text-foreground-muted">Citations</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {exchange.answer.citations.map((citation) => (
                      <li key={`${citation.kind}-${citation.id}`}>
                        <a
                          href={citation.href}
                          className="type-body-sm text-accent underline-offset-4 hover:underline"
                        >
                          {citation.kind}: {citation.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {exchange.answer.missingInformation.length > 0 ? (
                <p className="type-body-sm mt-4 text-foreground-muted">
                  Missing: {exchange.answer.missingInformation.join("; ")}
                </p>
              ) : null}
              <p className="type-body-sm mt-3 text-foreground-muted">
                Next: {exchange.answer.suggestedAction}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
