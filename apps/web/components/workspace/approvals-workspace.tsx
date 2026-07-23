"use client";

import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge } from "@axon/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApprovalSubjectKind = "architecture" | "proposal" | "comment" | "share";
type ApprovalStatus = "pending" | "approved" | "rejected";
type ApprovalUiStatus = "idle" | "loading" | "ready" | "saving" | "error";

interface ProjectApproval {
  readonly id: string;
  readonly subjectKind: ApprovalSubjectKind;
  readonly subjectId: string;
  readonly title: string;
  readonly description?: string;
  readonly status: ApprovalStatus;
  readonly createdAt: string;
}

export function ApprovalsWorkspace({ document }: { document: ArchitectureDocument }) {
  const [approvals, setApprovals] = useState<ProjectApproval[]>([]);
  const [status, setStatus] = useState<ApprovalUiStatus>("idle");
  const [title, setTitle] = useState("Approve current architecture");
  const [description, setDescription] = useState("");
  const [subjectKind, setSubjectKind] = useState<ApprovalSubjectKind>("architecture");
  const [subjectId, setSubjectId] = useState(document.id);
  const approvalsUrl = useMemo(
    () => `/api/projects/${encodeURIComponent(document.projectId)}/approvals`,
    [document.projectId],
  );

  const loadApprovals = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(approvalsUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to load approvals.");
      const payload = (await response.json()) as { approvals?: ProjectApproval[] };
      setApprovals(payload.approvals ?? []);
      setStatus("ready");
    } catch {
      setApprovals([]);
      setStatus("error");
    }
  }, [approvalsUrl]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  const createApproval = useCallback(async () => {
    setStatus("saving");
    try {
      const response = await fetch(approvalsUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          subjectKind,
          subjectId,
          title,
          ...(description.trim().length > 0 && { description }),
        }),
      });
      if (!response.ok) throw new Error("Failed to create approval.");
      await loadApprovals();
    } catch {
      setStatus("error");
    }
  }, [approvalsUrl, description, loadApprovals, subjectId, subjectKind, title]);

  const decideApproval = useCallback(
    async (approvalId: string, decision: "approved" | "rejected") => {
      setStatus("saving");
      try {
        const response = await fetch(`${approvalsUrl}/${encodeURIComponent(approvalId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ decision }),
        });
        if (!response.ok) throw new Error("Failed to decide approval.");
        await loadApprovals();
      } catch {
        setStatus("error");
      }
    },
    [approvalsUrl, loadApprovals],
  );

  const pendingCount = approvals.filter((approval) => approval.status === "pending").length;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="approvals-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-border-strong bg-surface p-4">
        <div>
          <p className="type-label-caps text-foreground-muted">Collaboration</p>
          <h2 id="approvals-heading" className="type-headline-md mt-2">
            Approvals
          </h2>
          <p className="type-body-md mt-2 text-foreground-muted">
            Request and record explicit review decisions for architecture work.
          </p>
        </div>
        <StatusBadge kind={status === "error" ? "warning" : "info"}>
          {status === "loading" ? "LOADING" : `${pendingCount} PENDING`}
        </StatusBadge>
      </div>

      <form
        className="grid gap-3 border-2 border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void createApproval();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Subject</span>
          <select
            value={subjectKind}
            onChange={(event) => {
              const next = event.target.value as ApprovalSubjectKind;
              setSubjectKind(next);
              setSubjectId(next === "architecture" ? document.id : next);
            }}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          >
            <option value="architecture">Architecture</option>
            <option value="proposal">Proposal</option>
            <option value="comment">Comment</option>
            <option value="share">Share</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Title</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            maxLength={160}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Description</span>
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            rows={3}
            maxLength={1000}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          />
        </label>
        <Button type="submit" variant="technical" size="sm" disabled={status === "saving"}>
          Request Approval
        </Button>
      </form>

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Approval Log</h3>
        {approvals.length === 0 ? (
          <p className="type-body-md mt-3 text-foreground-muted">No approvals requested yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {approvals.map((approval) => (
              <li key={approval.id} className="border-2 border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="type-mono-data text-foreground-muted">
                      {approval.subjectKind.toUpperCase()} · {approval.status.toUpperCase()}
                    </p>
                    <p className="type-body-md mt-2 text-foreground">{approval.title}</p>
                    {approval.description !== undefined ? (
                      <p className="type-body-sm mt-1 text-foreground-muted">
                        {approval.description}
                      </p>
                    ) : null}
                  </div>
                  {approval.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void decideApproval(approval.id, "approved")}
                        disabled={status === "saving"}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="technical"
                        size="sm"
                        onClick={() => void decideApproval(approval.id, "rejected")}
                        disabled={status === "saving"}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <StatusBadge kind={approval.status === "approved" ? "success" : "warning"}>
                      {approval.status.toUpperCase()}
                    </StatusBadge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
