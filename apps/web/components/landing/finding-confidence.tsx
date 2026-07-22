export function FindingConfidence({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="h-2 w-24 border border-border-strong bg-surface-muted">
        <span className="block h-full bg-accent" style={{ width: `${value}%` }} />
      </span>
      <span className="type-mono-data text-foreground-muted">{value}% confidence</span>
    </span>
  );
}
