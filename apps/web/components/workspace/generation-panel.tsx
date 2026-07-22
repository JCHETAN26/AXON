"use client";

import {
  buildArchitectureDocument,
  type GeneratedArchitectureDraft,
} from "@axon/architecture-generation";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, cx } from "@axon/ui";
import { useState, type FormEvent } from "react";

import { getProjectRepository } from "@/lib/projects/get-repository";

interface GenerateResponseBody {
  draft: GeneratedArchitectureDraft;
  providerId: string;
  attempts: number;
  mode: "live" | "offline";
}

export interface GenerationPanelProps {
  projectId: string;
  /** The blank document being replaced — its identity is preserved. */
  document: ArchitectureDocument;
  onGenerated: (document: ArchitectureDocument) => void;
}

type PanelStatus = "idle" | "generating" | "error";

const MIN_PROMPT_LENGTH = 10;

export function GenerationPanel({ projectId, document, onGenerated }: GenerationPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_PROMPT_LENGTH) {
      setStatus("error");
      setErrorMessage("Describe the system in at least a sentence.");
      return;
    }
    setStatus("generating");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Generation failed (${response.status}).`);
      }
      const payload = (await response.json()) as GenerateResponseBody;

      // AXON owns identity: the existing document id, project binding and
      // creation time are preserved; only the content is generated.
      const nextDocument = buildArchitectureDocument({
        draft: payload.draft,
        documentId: document.id,
        projectId,
        createdAt: document.createdAt,
        updatedAt: new Date().toISOString(),
        prompt: trimmed,
        providerId: payload.providerId,
      });

      const saved = await getProjectRepository().updateDocument(projectId, nextDocument);
      setStatus("idle");
      onGenerated(saved.document);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Generation failed.");
    }
  };

  const statusText =
    status === "generating"
      ? "GENERATING · validating the draft before anything is saved"
      : status === "error"
        ? `GENERATION_FAILED · ${errorMessage ?? "unknown error"}`
        : "GENERATION_READY · nothing is sent until you generate";

  return (
    <div className="border-2 border-border-strong bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
        <p className="type-mono-data text-foreground-muted">PROMPT_TO_ARCHITECTURE · beta</p>
        <p className="type-mono-data text-foreground-muted">
          no model key configured? a labeled offline template is used
        </p>
      </div>
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        noValidate
        className="flex flex-col gap-4 p-5"
      >
        <div>
          <label htmlFor="generation-prompt" className="type-label-caps text-foreground-muted">
            Describe the system
          </label>
          <textarea
            id="generation-prompt"
            value={prompt}
            rows={4}
            maxLength={2000}
            aria-invalid={status === "error"}
            onChange={(event) => {
              setPrompt(event.target.value);
              if (status === "error") {
                setStatus("idle");
                setErrorMessage(null);
              }
            }}
            placeholder="e.g. A multi-tenant invoicing platform with subscription billing, background PDF generation, and usage analytics on AWS."
            className={cx(
              "type-body-md mt-2 w-full rounded-control border-2 bg-surface px-3 py-2.5 text-foreground",
              "placeholder:text-foreground-muted focus:border-accent focus:outline-none",
              status === "error" ? "border-critical" : "border-border-strong",
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="primary" size="md" disabled={status === "generating"}>
            {status === "generating" ? "Generating…" : "Generate Architecture"}
          </Button>
          <p
            role="status"
            aria-live="polite"
            aria-label="Generation status"
            className={cx(
              "type-mono-data",
              status === "error" ? "text-critical" : "text-foreground-muted",
            )}
          >
            {statusText}
          </p>
        </div>
      </form>
    </div>
  );
}
