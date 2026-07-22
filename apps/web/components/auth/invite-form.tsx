"use client";

import { buttonClasses, cx } from "@axon/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Client form that redeems a private-beta invitation via the server route.
 * The route derives identity from the session; the code is the only input.
 */
export function InviteForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code }),
      });
      if (response.ok) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Invitation could not be redeemed.");
      setBusy(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="invite-code" className="type-label-caps text-foreground-muted">
        Invitation code
      </label>
      <input
        id="invite-code"
        value={code}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setCode(event.target.value);
        }}
        className="type-mono-data rounded-control border-2 border-border bg-surface px-3 py-2 focus-visible:border-accent focus-visible:outline-none"
      />
      {error !== null && (
        <p role="alert" className="type-mono-data text-critical">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || code.trim() === ""}
        className={buttonClasses("primary", "md", cx("w-full"))}
      >
        {busy ? "Redeeming…" : "Redeem invitation"}
      </button>
    </form>
  );
}
