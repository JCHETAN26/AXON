"use client";

import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge } from "@axon/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type CommentAnchorKind = "node" | "edge" | "diagram";
type CommentStatus = "idle" | "loading" | "ready" | "saving" | "error";

interface ProjectComment {
  readonly id: string;
  readonly body: string;
  readonly anchorKind?: CommentAnchorKind;
  readonly anchorId?: string;
  readonly resolvedAt?: string;
  readonly createdAt: string;
}

export function CommentsWorkspace({ document }: { document: ArchitectureDocument }) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [status, setStatus] = useState<CommentStatus>("idle");
  const [body, setBody] = useState("");
  const [anchorKind, setAnchorKind] = useState<CommentAnchorKind>("diagram");
  const [anchorId, setAnchorId] = useState("diagram");
  const commentsUrl = useMemo(
    () => `/api/projects/${encodeURIComponent(document.projectId)}/comments`,
    [document.projectId],
  );
  const anchorOptions = useMemo(
    () => [
      { kind: "diagram" as const, id: "diagram", label: "Diagram" },
      ...document.nodes.map((node) => ({ kind: "node" as const, id: node.id, label: node.name })),
      ...document.edges.map((edge) => ({ kind: "edge" as const, id: edge.id, label: edge.id })),
    ],
    [document.edges, document.nodes],
  );

  const loadComments = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(commentsUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to load comments.");
      const payload = (await response.json()) as { comments?: ProjectComment[] };
      setComments(payload.comments ?? []);
      setStatus("ready");
    } catch {
      setComments([]);
      setStatus("error");
    }
  }, [commentsUrl]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const createComment = useCallback(async () => {
    setStatus("saving");
    try {
      const response = await fetch(commentsUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ body, anchorKind, anchorId }),
      });
      if (!response.ok) throw new Error("Failed to create comment.");
      setBody("");
      await loadComments();
    } catch {
      setStatus("error");
    }
  }, [anchorId, anchorKind, body, commentsUrl, loadComments]);

  const resolveComment = useCallback(
    async (commentId: string) => {
      setStatus("saving");
      try {
        const response = await fetch(`${commentsUrl}/${encodeURIComponent(commentId)}`, {
          method: "PATCH",
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error("Failed to resolve comment.");
        await loadComments();
      } catch {
        setStatus("error");
      }
    },
    [commentsUrl, loadComments],
  );

  const unresolvedCount = comments.filter((comment) => comment.resolvedAt === undefined).length;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="comments-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-border-strong bg-surface p-4">
        <div>
          <p className="type-label-caps text-foreground-muted">Collaboration</p>
          <h2 id="comments-heading" className="type-headline-md mt-2">
            Comments
          </h2>
          <p className="type-body-md mt-2 text-foreground-muted">
            Leave review notes on the diagram, services, or connections.
          </p>
        </div>
        <StatusBadge kind={status === "error" ? "warning" : "info"}>
          {status === "loading" ? "LOADING" : `${unresolvedCount} OPEN`}
        </StatusBadge>
      </div>

      <form
        className="grid gap-3 border-2 border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void createComment();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Anchor</span>
          <select
            value={`${anchorKind}:${anchorId}`}
            onChange={(event) => {
              const [kind, id] = event.target.value.split(":");
              setAnchorKind(kind as CommentAnchorKind);
              setAnchorId(id ?? "diagram");
            }}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          >
            {anchorOptions.map((option) => (
              <option key={`${option.kind}:${option.id}`} value={`${option.kind}:${option.id}`}>
                {option.kind.toUpperCase()} · {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="type-label-caps text-foreground-muted">Comment</span>
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
            }}
            maxLength={2000}
            rows={4}
            className="type-body-md border-2 border-border bg-surface px-3 py-2 text-foreground"
          />
        </label>
        <Button type="submit" variant="technical" size="sm" disabled={status === "saving"}>
          Add Comment
        </Button>
      </form>

      <section className="border-2 border-border bg-surface p-4">
        <h3 className="type-label-caps text-foreground-muted">Thread</h3>
        {comments.length === 0 ? (
          <p className="type-body-md mt-3 text-foreground-muted">No comments yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {comments.map((comment) => (
              <li key={comment.id} className="border-2 border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="type-mono-data text-foreground-muted">
                      {(comment.anchorKind ?? "diagram").toUpperCase()} ·{" "}
                      {comment.anchorId ?? "diagram"}
                    </p>
                    <p className="type-body-md mt-2 text-foreground">{comment.body}</p>
                  </div>
                  {comment.resolvedAt === undefined ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void resolveComment(comment.id);
                      }}
                      disabled={status === "saving"}
                    >
                      Resolve
                    </Button>
                  ) : (
                    <StatusBadge kind="info">RESOLVED</StatusBadge>
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
