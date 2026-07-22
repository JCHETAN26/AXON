/** A safe, deterministic slug for use in export filenames. */
export function safeFilenameSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug === "" ? "project" : slug;
}

/** Builds `axon-<slug>-<date>.json`. Date is UTC YYYY-MM-DD. */
export function exportFilename(prefix: string, name: string, now: Date): string {
  const date = now.toISOString().slice(0, 10);
  return `axon-${prefix}-${safeFilenameSlug(name)}-${date}.json`;
}
