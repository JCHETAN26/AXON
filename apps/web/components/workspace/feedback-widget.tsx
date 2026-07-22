"use client";

import { Button, cx } from "@axon/ui";
import { useState } from "react";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "confusing", label: "Confusing" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

/** Lightweight product-feedback form for beta users. Posts to /api/feedback. */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ category, message }),
      });
      if (response.ok) {
        setState("sent");
        setMessage("");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not send feedback.");
      setState("error");
    } catch {
      setError("Could not send feedback.");
      setState("error");
    }
  };

  if (!open) {
    return (
      <Button variant="technical" size="sm" onClick={() => setOpen(true)}>
        Feedback
      </Button>
    );
  }

  return (
    <div className="absolute right-0 top-12 z-50 w-80 rounded-module border-2 border-border-strong bg-surface p-4 shadow-lg">
      {state === "sent" ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="type-body-md">Thanks — your feedback was recorded.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setState("idle");
              setOpen(false);
            }}
          >
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="type-label-caps text-foreground-muted">Send feedback</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="type-mono-data text-foreground-muted hover:text-foreground"
              aria-label="Close feedback"
            >
              ✕
            </button>
          </div>
          <label htmlFor="feedback-category" className="sr-only">
            Category
          </label>
          <select
            id="feedback-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as Category)}
            className="type-mono-data rounded-control border-2 border-border bg-surface px-2 py-1.5"
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor="feedback-message" className="sr-only">
            Message
          </label>
          <textarea
            id="feedback-message"
            value={message}
            rows={4}
            required
            placeholder="What's on your mind?"
            onChange={(event) => setMessage(event.target.value)}
            className="type-body-md rounded-control border-2 border-border bg-surface px-2.5 py-2 focus-visible:border-accent focus-visible:outline-none"
          />
          {error !== null && (
            <p role="alert" className={cx("type-mono-data text-critical")}>
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={state === "sending" || message.trim() === ""}
          >
            {state === "sending" ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      )}
    </div>
  );
}
