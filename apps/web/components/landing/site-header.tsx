"use client";

import { ThemeToggle, buttonClasses, cx } from "@axon/ui";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { label: "Product", href: "#product" },
  { label: "MCP", href: "#mcp" },
  { label: "Pricing", href: "#pricing" },
] as const;

const NAV_LINK_CLASSES = cx(
  "type-label-caps text-foreground-muted transition-colors",
  "motion-safe:duration-(--duration-fast) hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
);

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      aria-hidden
    >
      {open ? <path d="m4 4 10 10M14 4 4 14" /> : <path d="M2 5h14M2 9h14M2 13h14" />}
    </svg>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the open menu with Escape, returning focus to the toggle.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-5 md:px-8 lg:px-16">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            AXON
          </Link>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={NAV_LINK_CLASSES}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <ThemeToggle />
          <a href="#sign-in" className={cx(NAV_LINK_CLASSES, "hidden md:inline")}>
            Sign In
          </a>
          <Link
            href="/projects/new"
            className={cx(buttonClasses("primary", "sm"), "hidden md:inline-flex")}
          >
            Start Building Free
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            className={cx(
              "flex size-9 items-center justify-center rounded-control border border-border text-foreground md:hidden",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            <MenuIcon open={menuOpen} />
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-background md:hidden">
          <nav aria-label="Mobile">
            <ul className="flex flex-col gap-1 p-5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => {
                      setMenuOpen(false);
                    }}
                    className={cx(NAV_LINK_CLASSES, "block py-3")}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#sign-in"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className={cx(NAV_LINK_CLASSES, "block py-3")}
                >
                  Sign In
                </a>
              </li>
            </ul>
          </nav>
          <div className="px-5 pb-5">
            <Link
              href="/projects/new"
              onClick={() => {
                setMenuOpen(false);
              }}
              className={buttonClasses("primary", "md", "w-full")}
            >
              Start Building Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
