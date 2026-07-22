import { type ComponentPropsWithRef } from "react";

import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "technical";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: cx(
    "type-label-caps border-transparent bg-primary text-primary-foreground",
    "hover:shadow-[4px_4px_0_0_var(--color-accent)]",
  ),
  secondary: cx(
    "type-label-caps border-border-strong bg-transparent text-foreground",
    "hover:bg-surface-subtle",
  ),
  technical: cx(
    "type-mono-data border-border bg-surface text-foreground",
    "hover:border-accent hover:text-accent",
  ),
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-12 px-6",
};

/**
 * Class list for button-shaped controls. Exposed so links that visually act
 * as buttons (e.g. CTAs) can share the exact styles without duplicating them.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-control border",
    "transition motion-safe:duration-(--duration-fast) motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}
