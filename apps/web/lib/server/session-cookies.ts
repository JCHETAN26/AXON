/**
 * Clears the Auth.js session cookies on a response, invalidating the browser's
 * authenticated access. Used after account deletion so the (now non-existent)
 * account's token cannot be reused. Both the dev and production ("__Secure-")
 * cookie names are cleared.
 */
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
];

export function clearSessionCookies(response: Response): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  for (const name of SESSION_COOKIE_NAMES) {
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    );
  }
}
