"use client";

import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, cx } from "@axon/ui";
import { useEffect, useMemo, useState } from "react";

import { ReadOnlyArchitectureCanvas } from "@/components/canvas/read-only-architecture-canvas";
import {
  buildPresentationSteps,
  renderPresentationHtml,
  type PresentationStep,
} from "@/lib/canvas/presentation";
import { getPresentationRepository } from "@/lib/presentation/get-presentation-repository";
import {
  PRESENTATION_STATE_SCHEMA_VERSION,
  type PresentationState,
} from "@/lib/presentation/presentation-state";

function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = globalThis.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function filenameSafe(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "architecture"
  );
}

export function PresentationWorkspace({ document }: { document: ArchitectureDocument }) {
  const steps = useMemo(() => buildPresentationSteps(document), [document]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [speakerNotesByStepId, setSpeakerNotesByStepId] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">(
    "loading",
  );
  const activeStep: PresentationStep = steps[activeIndex] ?? {
    id: "empty",
    eyebrow: "Overview",
    title: document.name,
    summary: "No presentation steps are available for this architecture.",
    bullets: ["Add services, groups, flows, or assumptions to build a walkthrough."],
  };
  const activeNote = speakerNotesByStepId[activeStep.id] ?? "";
  const savedNoteCount = Object.values(speakerNotesByStepId).filter((note) => note.trim()).length;

  useEffect(() => {
    let cancelled = false;
    setSaveStatus("loading");
    void getPresentationRepository()
      .getPresentationState(document.projectId)
      .then((stored) => {
        if (cancelled) return;
        setSpeakerNotesByStepId(
          stored !== null && stored.documentId === document.id ? stored.speakerNotesByStepId : {},
        );
        setSaveStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setSaveStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [document.id, document.projectId]);

  const goTo = (index: number) => {
    setActiveIndex(Math.min(Math.max(index, 0), steps.length - 1));
  };

  const exportPresentationHtml = () => {
    downloadTextFile(
      `${filenameSafe(document.name)}-presentation.html`,
      renderPresentationHtml(document, { speakerNotesByStepId }),
      "text/html;charset=utf-8",
    );
  };

  const updateActiveNote = (note: string) => {
    setSpeakerNotesByStepId((current) => ({
      ...current,
      [activeStep.id]: note.slice(0, 2000),
    }));
    setSaveStatus("ready");
  };

  const saveNotes = async () => {
    setSaveStatus("saving");
    const trimmedNotes = Object.fromEntries(
      Object.entries(speakerNotesByStepId)
        .map(([stepId, note]) => [stepId, note.trim()] as const)
        .filter(([, note]) => note.length > 0),
    );
    const state: PresentationState = {
      schemaVersion: PRESENTATION_STATE_SCHEMA_VERSION,
      projectId: document.projectId,
      documentId: document.id,
      speakerNotesByStepId: trimmedNotes,
      updatedAt: new Date().toISOString(),
    };
    try {
      await getPresentationRepository().savePresentationState(state);
      setSpeakerNotesByStepId(trimmedNotes);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="presentation-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-4">
        <div>
          <p className="type-label-caps text-foreground-muted">Visual Architecture Studio</p>
          <h2 id="presentation-heading" className="type-headline-md mt-2">
            Presentation Mode
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="type-mono-data text-foreground-muted">
            Step {activeIndex + 1} of {steps.length}
          </p>
          <p className={cx("type-mono-data", saveStatus === "error" ? "text-warning" : "text-foreground-muted")}>
            {saveStatus === "saving"
              ? "SAVING_NOTES"
              : saveStatus === "saved"
                ? "NOTES_SAVED"
                : saveStatus === "loading"
                  ? "LOADING_NOTES"
                  : `${savedNoteCount} NOTE${savedNoteCount === 1 ? "" : "S"}`}
          </p>
          <Button variant="technical" size="sm" onClick={exportPresentationHtml}>
            Export Walkthrough HTML
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ReadOnlyArchitectureCanvas
          document={document}
          label={`${document.name} presentation diagram`}
          className="h-[620px] w-full overflow-hidden border-2 border-border-strong bg-surface"
        />

        <aside className="flex flex-col gap-4 border-2 border-border-strong bg-surface p-4">
          <div>
            <p className="type-label-caps text-foreground-muted">{activeStep.eyebrow}</p>
            <h3 className="type-headline-md mt-2">{activeStep.title}</h3>
            <p className="type-body-md mt-3 text-foreground-muted">{activeStep.summary}</p>
          </div>

          <ul className="flex flex-col gap-2">
            {activeStep.bullets.map((bullet) => (
              <li key={bullet} className="border-l-2 border-border-strong pl-3">
                <span className="type-body-md">{bullet}</span>
              </li>
            ))}
          </ul>

          <label className="flex flex-col gap-2 border-t-2 border-border pt-4">
            <span className="type-label-caps text-foreground-muted">Speaker Notes</span>
            <textarea
              className="min-h-28 border-2 border-border bg-surface p-3 type-body-sm text-foreground"
              maxLength={2000}
              value={activeNote}
              onChange={(event) => {
                updateActiveNote(event.currentTarget.value);
              }}
              placeholder="Private presenter notes for this step"
            />
          </label>

          <div className="mt-auto flex flex-wrap gap-2">
            <Button
              variant="technical"
              size="sm"
              onClick={() => {
                goTo(activeIndex - 1);
              }}
              disabled={activeIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="technical"
              size="sm"
              onClick={() => {
                goTo(activeIndex + 1);
              }}
              disabled={activeIndex === steps.length - 1}
            >
              Next
            </Button>
            <Button
              variant="technical"
              size="sm"
              onClick={() => {
                void saveNotes();
              }}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving" : "Save Notes"}
            </Button>
          </div>
        </aside>
      </div>

      <div role="tablist" aria-label="Presentation steps" className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            onClick={() => {
              goTo(index);
            }}
            className={cx(
              "type-label-caps border-2 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-accent",
              activeIndex === index
                ? "border-accent bg-accent-muted text-foreground"
                : "border-border text-foreground-muted hover:border-border-strong",
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
