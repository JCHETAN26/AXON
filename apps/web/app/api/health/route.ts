import { PRODUCT_VERSION } from "@/lib/server/version";

/**
 * Liveness. Confirms only that the server process can respond. It never touches
 * PostgreSQL, reveals no configuration or infrastructure detail, and returns
 * quickly with a safe build identifier. Use `/api/ready` for readiness.
 */
export function GET(): Response {
  return new Response(JSON.stringify({ status: "ok", version: PRODUCT_VERSION }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
