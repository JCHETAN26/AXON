import { type WorkspaceBoundary } from "./workspace-boundary";

/**
 * Configuration for the local file watcher.
 */
export interface FileWatcherConfig {
  /** Workspace boundary to enforce during watching. */
  boundary: WorkspaceBoundary;
  /** Debounce interval in milliseconds (default 300). */
  debounceMs?: number;
  /** Callback when analysis-relevant changes are detected. */
  onChange: (changedFiles: ChangedFile[]) => void;
  /** Callback when watcher overflows. */
  onOverflow?: () => void;
}

export interface ChangedFile {
  relativePath: string;
  absolutePath: string;
  eventType: "add" | "change" | "delete" | "rename";
}

export type FileWatcherStatus = "idle" | "watching" | "debouncing" | "stopped" | "overflow";

/**
 * A local file watcher that is **disabled by default** and must be explicitly
 * started. Watches only approved workspace roots, respects ignore rules,
 * debounces changes, and notifies the consumer with changed file metadata.
 *
 * The watcher never executes analyzed code or applies infrastructure changes.
 */
export class FileWatcher {
  private readonly boundary: WorkspaceBoundary;
  private readonly debounceMs: number;
  private readonly onChange: (files: ChangedFile[]) => void;
  private readonly onOverflow?: () => void;

  private pendingChanges = new Map<string, ChangedFile>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: FileWatcherStatus = "idle";
  private watcher: { close: () => void } | null = null;

  constructor(config: FileWatcherConfig) {
    this.boundary = config.boundary;
    this.debounceMs = config.debounceMs ?? 300;
    this.onChange = config.onChange;
    if (config.onOverflow !== undefined) this.onOverflow = config.onOverflow;
  }

  get status(): FileWatcherStatus {
    return this._status;
  }

  /**
   * Start watching the workspace root. The watcher is always opt-in.
   */
  async start(): Promise<void> {
    if (this._status === "watching" || this._status === "debouncing") {
      return;
    }

    const { watch } = await import("node:fs");

    try {
      const fsWatcher = watch(
        this.boundary.rootDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;
          this.handleFsEvent(eventType, filename);
        }
      );

      fsWatcher.on("error", () => {
        this._status = "overflow";
        this.onOverflow?.();
      });

      this.watcher = fsWatcher;
      this._status = "watching";
    } catch {
      this._status = "stopped";
    }
  }

  /**
   * Stop the watcher and flush any pending changes.
   */
  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Flush any pending
    if (this.pendingChanges.size > 0) {
      this.flush();
    }

    this._status = "stopped";
  }

  private handleFsEvent(eventType: string, filename: string): void {
    // Check if file is excluded by boundary
    const exclusion = this.boundary.isExcluded(filename);
    if (exclusion.excluded) return;

    // Filter out editor swap/temp files
    if (this.isTemporaryFile(filename)) return;

    const change: ChangedFile = {
      relativePath: filename,
      absolutePath: `${this.boundary.rootDir}/${filename}`,
      eventType: eventType === "rename" ? "rename" : "change",
    };

    this.pendingChanges.set(filename, change);
    this._status = "debouncing";

    // Reset debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  private flush(): void {
    const changes = Array.from(this.pendingChanges.values());
    this.pendingChanges.clear();
    this.debounceTimer = null;

    if (this._status !== "stopped") {
      this._status = "watching";
    }

    if (changes.length > 0) {
      this.onChange(changes);
    }
  }

  private isTemporaryFile(filename: string): boolean {
    // Common editor swap/temp patterns
    if (filename.endsWith("~")) return true;
    if (filename.endsWith(".swp") || filename.endsWith(".swo")) return true;
    if (filename.startsWith(".#")) return true;
    if (filename.endsWith(".tmp")) return true;
    if (filename.includes("__jb_")) return true; // JetBrains temp files
    if (filename.endsWith(".DS_Store")) return true;
    return false;
  }
}
