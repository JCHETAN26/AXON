"use client";

/**
 * Global error boundary (replaces the root layout when it fails). Must be
 * self-contained HTML. Reveals no internal detail.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>AXON is temporarily unavailable</h1>
          <p style={{ color: "#666" }}>
            Something went wrong. Please try again in a moment.
            {error.digest !== undefined ? ` Reference: ${error.digest}` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
