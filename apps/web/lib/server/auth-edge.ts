import NextAuth from "next-auth";

/**
 * Edge-safe Auth.js instance for middleware. It decodes the JWT session cookie
 * only — no providers, no database adapter — so the PostgreSQL driver never
 * loads on the edge runtime. Session identity is validated here to gate
 * product routes; beta access (which needs the database) is enforced in the
 * server-component page guard and the API routes.
 */
export const { auth: edgeAuth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  ...(process.env.AUTH_SECRET !== undefined && { secret: process.env.AUTH_SECRET }),
  callbacks: {
    session({ session, token }) {
      if (typeof token.sub === "string") session.user.id = token.sub;
      return session;
    },
  },
  providers: [],
});
