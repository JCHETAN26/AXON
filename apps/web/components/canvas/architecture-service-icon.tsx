import { type SVGProps } from "react";

import { type ArchitectureIconRecord } from "@/lib/icons/architecture-icon-registry";

interface ArchitectureServiceIconProps extends Omit<SVGProps<SVGSVGElement>, "aria-label"> {
  readonly icon: ArchitectureIconRecord;
}

const PATHS: Record<ArchitectureIconRecord["glyph"], readonly string[]> = {
  ai: ["M4 10h12", "M10 4v12", "M6 6l8 8", "M14 6l-8 8"],
  auth: ["M5 9V7a5 5 0 0 1 10 0v2", "M4 9h12v8H4z"],
  cache: [
    "M4 6c0-1.1 2.7-2 6-2s6 .9 6 2-2.7 2-6 2-6-.9-6-2Z",
    "M4 6v8c0 1.1 2.7 2 6 2s6-.9 6-2V6",
    "M4 10c0 1.1 2.7 2 6 2s6-.9 6-2",
  ],
  compute: ["M4 5h12v10H4z", "M7 2v3M13 2v3M7 15v3M13 15v3M2 8h2M2 12h2M16 8h2M16 12h2"],
  database: [
    "M4 5c0-1.1 2.7-2 6-2s6 .9 6 2v10c0 1.1-2.7 2-6 2s-6-.9-6-2V5Z",
    "M4 5c0 1.1 2.7 2 6 2s6-.9 6-2",
    "M4 10c0 1.1 2.7 2 6 2s6-.9 6-2",
  ],
  gateway: ["M3 10h14", "M10 3l7 7-7 7", "M3 5h5M3 15h5"],
  kubernetes: ["M10 2 17 6v8l-7 4-7-4V6l7-4Z", "M10 6v8M6.5 8l7 4M13.5 8l-7 4"],
  observability: ["M3 13s2.5-5 7-5 7 5 7 5", "M10 10.5a2.5 2.5 0 1 0 0 .1", "M5 16l10-12"],
  queue: ["M4 6h9a3 3 0 0 1 0 6H7a3 3 0 0 0 0 6h9", "M7 3 4 6l3 3", "M13 9l3 3-3 3"],
  storage: ["M4 4h12v12H4z", "M7 4v12", "M4 8h12", "M11 11h3"],
  unknown: ["M10 3a4 4 0 0 1 2 7.5c-1.2.7-2 1.3-2 2.5", "M10 17v.5"],
};

export function ArchitectureServiceIcon({ icon, ...props }: ArchitectureServiceIconProps) {
  return (
    <svg
      width={icon.defaultSize}
      height={icon.defaultSize}
      viewBox={icon.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      role="img"
      aria-label={`${icon.service} icon`}
      {...props}
    >
      {PATHS[icon.glyph].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
