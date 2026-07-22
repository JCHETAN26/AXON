import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { isSafeRedirect, isTestAuthEnabled } from "./auth-helpers";
import { getDatabase } from "./db/client";
import { accounts, sessions, users, verificationTokens } from "./db/schema";

export { isSafeRedirect, isTestAuthEnabled } from "./auth-helpers";

function buildProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = [];
  const clientId = process.env.AUTH_GITHUB_ID;
  const clientSecret = process.env.AUTH_GITHUB_SECRET;
  if (clientId !== undefined && clientSecret !== undefined) {
    providers.push(
      // Minimal identity scope only — no repository access is ever requested.
      GitHub({
        clientId,
        clientSecret,
        authorization: { params: { scope: "read:user user:email" } },
      }),
    );
  }
  if (isTestAuthEnabled()) {
    providers.push(
      Credentials({
        id: "test-auth",
        name: "Test Auth",
        credentials: { email: { label: "Email" } },
        authorize: async (raw) => {
          const email =
            typeof raw?.email === "string" && raw.email.length > 0
              ? raw.email
              : "beta-tester@example.com";
          // The returned id becomes the owner of all product data, so it must
          // be a real users row (its id backs foreign keys). Upsert the test
          // user and return the persisted id. Never reachable in production —
          // the provider is not registered there.
          const { getDatabaseAsync } = await import("./db/client");
          const { users } = await import("./db/schema");
          const { eq } = await import("drizzle-orm");
          const db = await getDatabaseAsync();
          const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
          const id =
            existing[0]?.id ??
            (
              await db
                .insert(users)
                .values({ email, name: "Beta Tester" })
                .returning({ id: users.id })
            )[0]?.id;
          if (id === undefined) return null;
          return { id, email, name: "Beta Tester" };
        },
      }),
    );
  }
  return providers;
}

const hasDatabase = (process.env.DATABASE_URL ?? "").length > 0;

export const authConfig: NextAuthConfig = {
  // The adapter persists OAuth users/accounts. When no database is configured
  // (pure local/test-auth dev) it is omitted so importing this module is safe.
  ...(hasDatabase && {
    adapter: DrizzleAdapter(getDatabase(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
  }),
  // JWT sessions work with both OAuth and the Credentials test provider, and
  // keep provider tokens out of the browser entirely.
  session: { strategy: "jwt" },
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: { signIn: "/sign-in" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id !== undefined) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub !== undefined) session.user.id = token.sub;
      return session;
    },
    redirect({ url, baseUrl }) {
      return isSafeRedirect(url, baseUrl)
        ? url.startsWith("/")
          ? `${baseUrl}${url}`
          : url
        : baseUrl;
    },
  },
  providers: buildProviders(),
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
