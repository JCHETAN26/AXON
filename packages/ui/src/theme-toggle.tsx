"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./cx";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";
import { useTheme, type ThemePreference } from "./theme/theme-provider";

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: ReactNode;
}

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", icon: <SunIcon /> },
  { value: "dark", label: "Dark", icon: <MoonIcon /> },
  { value: "system", label: "System", icon: <MonitorIcon /> },
];

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Three-state light / dark / system selector with radio-group semantics.
 * Must be rendered inside a <ThemeProvider>.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // The stored preference is only known on the client; render no selection
  // until mounted so server and client markup stay consistent.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const activeTheme = mounted ? theme : null;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (direction === 0) {
      return;
    }
    event.preventDefault();
    const currentIndex = OPTIONS.findIndex((option) => option.value === theme);
    const nextIndex = (currentIndex + direction + OPTIONS.length) % OPTIONS.length;
    const nextOption = OPTIONS[nextIndex];
    if (nextOption !== undefined) {
      setTheme(nextOption.value);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cx(
        "inline-flex items-center gap-0.5 rounded-process border border-border bg-surface p-1",
        className,
      )}
    >
      {OPTIONS.map((option, index) => {
        const checked = activeTheme === option.value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (activeTheme === null && index === 0) ? 0 : -1}
            onClick={() => {
              setTheme(option.value);
            }}
            onKeyDown={onKeyDown}
            className={cx(
              "flex size-9 items-center justify-center rounded-process",
              "transition-colors motion-safe:duration-(--duration-fast) motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              checked
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {option.icon}
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
