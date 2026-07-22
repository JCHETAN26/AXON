"use client";

import { type Project } from "@axon/diagram-schema";
import { buttonClasses } from "@axon/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getAuditRepository } from "@/lib/audit/get-audit-repository";
import { getProjectRepository } from "@/lib/projects/get-repository";
import { getImportRepository } from "@/lib/import/get-import-repository";
import { getRecommendationRepository } from "@/lib/recommendations/get-recommendation-repository";
import { getSimulationRepository } from "@/lib/simulation/get-simulation-repository";

import { isClientCloudMode } from "@/lib/persistence/client-mode";

type ListState = { status: "loading" } | { status: "ready"; projects: Project[] };

export function ProjectList() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const projects = await getProjectRepository().listProjects();
    setState({ status: "ready", projects });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const confirmDelete = async () => {
    if (pendingDelete === null) return;
    const projectId = pendingDelete.id;
    setBusy(true);
    // In cloud mode the owner-scoped project delete cascades its artifacts
    // server-side; the artifact deletes are harmless no-ops there and clean up
    // local drafts in local mode.
    await getProjectRepository().deleteProject(projectId);
    await getAuditRepository().deleteAuditState(projectId);
    await getSimulationRepository().deleteSimulationState(projectId);
    await getRecommendationRepository().deleteRecommendationState(projectId);
    await getImportRepository().deleteDraft(projectId);
    setBusy(false);
    setPendingDelete(null);
    await refresh();
  };

  if (state.status === "loading") {
    return <p className="type-mono-data text-foreground-muted">LOADING_PROJECTS…</p>;
  }

  if (state.projects.length === 0) {
    return (
      <div className="border-2 border-dashed border-border-strong p-10 text-center">
        <p className="type-headline-md">No projects yet.</p>
        <p className="type-body-md mt-3 text-foreground-muted">
          Create your first architecture — blank, or seeded with the sample system from the
          homepage.
        </p>
        <Link href="/projects/new" className={buttonClasses("primary", "md", "mt-6")}>
          New Project
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border border-2 border-border-strong bg-surface">
      {state.projects.map((project) => (
        <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <Link
              href={`/projects/${project.id}`}
              className="type-body-lg font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {project.name}
            </Link>
            <p className="type-mono-data mt-1 text-foreground-muted">
              created {new Date(project.createdAt).toLocaleDateString("en-US")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}`} className={buttonClasses("technical", "sm")}>
              Open
            </Link>
            {isClientCloudMode() && (
              <a
                href={`/api/projects/${project.id}/export`}
                download
                aria-label={`Export project ${project.name}`}
                className={buttonClasses("technical", "sm")}
              >
                Export
              </a>
            )}
            <button
              type="button"
              aria-label={`Delete project ${project.name}`}
              onClick={() => {
                setPendingDelete(project);
              }}
              className={buttonClasses(
                "technical",
                "sm",
                "hover:border-critical hover:text-critical",
              )}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
      {pendingDelete !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            className="w-full max-w-md border-2 border-border-strong bg-surface p-6"
          >
            <h2 id="delete-project-title" className="type-headline-md text-critical">
              Delete “{pendingDelete.name}”?
            </h2>
            <p className="type-body-md mt-3 text-foreground-muted">
              This deletes the AXON project and its saved architecture data. It does not change
              deployed infrastructure. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDelete()}
                className={buttonClasses("primary", "md", "border-transparent bg-critical")}
              >
                {busy ? "Deleting…" : "Delete project"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingDelete(null)}
                className={buttonClasses("secondary", "md")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ul>
  );
}
