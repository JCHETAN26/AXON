"use client";

import { useRef, type ComponentPropsWithRef, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./cx";

export interface CanvasToolbarProps {
  /** Accessible name for the toolbar, e.g. "Canvas controls". */
  label: string;
  children: ReactNode;
  className?: string;
}

const NAVIGATION_KEYS = ["ArrowLeft", "ArrowRight", "Home", "End"];

/**
 * Horizontal toolbar for canvas actions. Arrow keys, Home and End move focus
 * between the enabled buttons inside it.
 */
export function CanvasToolbar({ label, children, className }: CanvasToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!NAVIGATION_KEYS.includes(event.key)) {
      return;
    }
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const items = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    );
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    let nextIndex = currentIndex;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
    }
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cx(
        "inline-flex items-center gap-1 border border-border bg-surface p-1",
        "shadow-[4px_4px_0_0_var(--color-border)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface CanvasToolbarButtonProps extends ComponentPropsWithRef<"button"> {
  /** Accessible name for the icon button. */
  label: string;
}

export function CanvasToolbarButton({
  label,
  className,
  children,
  type = "button",
  ...rest
}: CanvasToolbarButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "flex size-9 items-center justify-center rounded-control text-foreground-muted",
        "transition-colors motion-safe:duration-(--duration-fast) motion-reduce:transition-none",
        "hover:bg-surface-subtle hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function CanvasToolbarSeparator() {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      className="mx-1 h-5 w-px self-center bg-border"
    />
  );
}
