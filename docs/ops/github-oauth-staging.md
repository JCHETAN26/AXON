# GitHub OAuth staging smoke test

Do **not** automate live GitHub OAuth in CI. Run this checklist by hand against
the staging deployment.

## Setup

- [ ] A GitHub OAuth application exists for staging.
- [ ] Authorization callback URL is **exactly**
      `https://<staging-host>/api/auth/callback/github`.
- [ ] Homepage URL is `https://<staging-host>`.
- [ ] Only identity scopes are requested (`read:user user:email`). **No**
      repository scope.
- [ ] `AXON_APP_URL` matches the staging host.
- [ ] `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` are set for staging.

## Flow

- [ ] Sign in with GitHub succeeds.
- [ ] The correct user is created or linked.
- [ ] Signing in alone does **not** grant beta access.
- [ ] A non-beta user is routed to `/invite`.
- [ ] Redeeming a valid invitation grants access.
- [ ] The original safe destination is restored after sign-in.
- [ ] A malicious `callbackUrl` (e.g. `//evil.com`, `https://evil.com`) is
      rejected and falls back to a safe route.
- [ ] A created project persists after reload.
- [ ] Sign-out removes product access (`/projects` → `/sign-in`).
- [ ] Signing in again restores the account's projects.

## Token hygiene

- [ ] The client session payload contains **no** provider access token
      (inspect the JWT / `session` — only an identity subject is present).
- [ ] Browser storage contains no OAuth secrets.
- [ ] `pnpm verify:client-bundle` passes on the staging build.
