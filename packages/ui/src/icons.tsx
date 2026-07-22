import { type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function iconDefaults(props: IconProps): IconProps {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "square" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M12.95 3.05l-1.4 1.4M4.45 11.55l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" />
    </svg>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <rect x="1.5" y="2.5" width="13" height="9" />
      <path d="M5.5 14.5h5M8 11.5v3" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <rect x="3.5" y="7" width="9" height="6.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="m3 8.5 3 3 7-7" />
    </svg>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function TriangleIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" />
      <path d="M8 7v3" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.5V11M8 5v.5" />
    </svg>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="8" cy="8" r="6" />
    </svg>
  );
}
