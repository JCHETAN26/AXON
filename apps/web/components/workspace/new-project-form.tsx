"use client";

import { Button, cx } from "@axon/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getProjectRepository } from "@/lib/projects/get-repository";
import { type ProjectTemplate } from "@/lib/projects/repository";

const TEMPLATES: readonly { id: ProjectTemplate; label: string; description: string }[] = [
  {
    id: "blank",
    label: "Blank",
    description: "Start from an empty architecture document.",
  },
  {
    id: "sample",
    label: "Sample architecture",
    description: "Seed the project with the 12-service SaaS reference system.",
  },
];

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<ProjectTemplate>("sample");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Give the project a name.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const created = await getProjectRepository().createProject({ name: trimmed, template });
      router.push(`/projects/${created.project.id}`);
    } catch {
      setError("Could not create the project. Check that this browser allows local storage.");
      setCreating(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className="flex max-w-xl flex-col gap-8"
    >
      <div>
        <label htmlFor="project-name" className="type-label-caps text-foreground-muted">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          maxLength={80}
          autoComplete="off"
          aria-invalid={error !== null}
          aria-describedby={error !== null ? "project-name-error" : undefined}
          onChange={(event) => {
            setName(event.target.value);
            if (error !== null) {
              setError(null);
            }
          }}
          className={cx(
            "type-body-md mt-2 w-full rounded-control border-2 bg-surface px-3 py-2.5 text-foreground",
            "placeholder:text-foreground-muted focus:border-accent focus:outline-none",
            error !== null ? "border-critical" : "border-border-strong",
          )}
          placeholder="e.g. checkout-platform"
        />
        {error !== null && (
          <p id="project-name-error" className="type-mono-data mt-2 text-critical">
            <span aria-hidden>▲ </span>
            {error}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="type-label-caps text-foreground-muted">Template</legend>
        <div className="mt-2 flex flex-col gap-2">
          {TEMPLATES.map((candidate) => (
            <label
              key={candidate.id}
              htmlFor={`template-${candidate.id}`}
              className={cx(
                "flex cursor-pointer items-start gap-3 border-2 bg-surface p-4 transition-colors",
                "motion-safe:duration-(--duration-fast)",
                template === candidate.id
                  ? "border-accent"
                  : "border-border hover:border-border-strong",
              )}
            >
              <input
                id={`template-${candidate.id}`}
                type="radio"
                name="template"
                value={candidate.id}
                checked={template === candidate.id}
                onChange={() => {
                  setTemplate(candidate.id);
                }}
                className="mt-1 size-4 shrink-0 accent-(--color-accent)"
              />
              <span className="type-body-md font-medium text-foreground">{candidate.label}</span>
              <span className="type-body-md text-foreground-muted">{candidate.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" size="md" disabled={creating}>
          {creating ? "Creating…" : "Create Project"}
        </Button>
        <p className="type-mono-data text-foreground-muted">Stored locally in this browser.</p>
      </div>
    </form>
  );
}
