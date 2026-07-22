import { signOut } from "@/lib/server/auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { isCloudMode } from "@/lib/server/persistence-mode";
import { FeedbackWidget } from "./feedback-widget";

/**
 * Right-hand product-header controls. In cloud mode it shows the signed-in
 * identity, the feedback widget, and a sign-out action (a server action that
 * clears the session cookie). In local mode it shows the local-first notice.
 */
export async function AccountControls() {
  if (!isCloudMode()) {
    return (
      <span className="type-mono-data hidden text-foreground-muted sm:inline">
        local-first beta · data stays in this browser
      </span>
    );
  }

  const user = await getCurrentUser();
  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <div className="relative flex items-center gap-3">
      <FeedbackWidget />
      {user?.email !== undefined && (
        <span className="type-mono-data hidden text-foreground-muted md:inline">{user.email}</span>
      )}
      <form action={signOutAction}>
        <button
          type="submit"
          className="type-label-caps text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
