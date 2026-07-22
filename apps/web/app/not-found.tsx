import { buttonClasses } from "@axon/ui";
import Link from "next/link";

/** Public 404. Reveals nothing about whether a private resource exists. */
export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-16"
    >
      <h1 className="type-headline-lg">Page not found</h1>
      <p className="type-body-md text-foreground-muted">
        The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className={buttonClasses("primary", "md")}>
          Home
        </Link>
        <Link href="/projects" className={buttonClasses("secondary", "md")}>
          Projects
        </Link>
      </div>
    </main>
  );
}
