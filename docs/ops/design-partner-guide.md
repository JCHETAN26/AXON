# Design-partner operator guide (internal)

For onboarding 3–10 invited beta users. Internal only.

## Per user

1. Confirm the target profile fits (see success criteria).
2. Generate an **email-restricted** invitation and set an expiration.
3. Send the code through a **secure channel**.
4. Confirm redemption.
5. Ask whether they'll use **real or sanitized** architecture.
6. Get **explicit permission** before observing a session.
7. Do **not** request production secrets, `.env` files, or cloud credentials.
8. Explain how architecture data is handled (owner-scoped, exportable,
   deletable; see the Data Handling page).
9. Watch them operate the product. **Avoid leading them toward findings.**
10. Record confusion and false positives (use the session template).
11. Revoke unused invitations.
12. Follow up after use.

## Boundaries

- Never observe or record raw architecture content without explicit permission.
- Never ask a user to upload secrets or infrastructure credentials.
- Keep notes free of the user's confidential architecture details.

## Session template

See `design-partner-session-template.md`.

## Success criteria

See `private-beta-success-criteria.md`. These are **internal learning
thresholds** — do not present them to users or as achieved metrics.
