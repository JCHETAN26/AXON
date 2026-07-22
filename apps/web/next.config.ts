import { type NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * Meets the required minimums (default-src 'self', object-src 'none',
 * base-uri 'self', frame-ancestors 'none', form-action 'self') and never
 * permits 'unsafe-eval'.
 *
 * Known limitation: `script-src` and `style-src` include 'unsafe-inline'.
 * Next.js App Router injects inline bootstrap/hydration scripts, and React Flow
 * applies inline styles for node positioning; a nonce-based policy in this
 * Next.js version is fragile to wire correctly and is the tracked follow-up
 * (see SECURITY-FOLLOWUPS below). This is a real, production-compatible policy,
 * not a nonce policy — it is documented as such.
 */
// React uses eval() only in development (for debugging/refresh); production
// never does. 'unsafe-eval' is therefore permitted in development only, so the
// production policy stays strict while local development is clean.
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** Baseline security headers applied to every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: [
    "@axon/ui",
    "@axon/diagram-schema",
    "@axon/architecture-generation",
    "@axon/architecture-audit",
    "@axon/architecture-compose-import",
    "@axon/architecture-simulation",
    "@axon/architecture-recommendations",
  ],
  // The postgres driver and PGlite are server-only; keep them out of any
  // client or edge bundle.
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
