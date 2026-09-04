import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import authConfig from "./auth.config";
import pool from "@/lib/db";
import { isEmailAllowed } from "@/lib/allowlist";
import { ensureUserSettingsRow, getOnboardingStatus } from "@/lib/userSettings";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
  // Required because an adapter alone would otherwise default toward
  // database sessions, which the Edge middleware can't read (no `pg` there).
  session: { strategy: "jwt" },
  providers: [Google],
  callbacks: {
    ...authConfig.callbacks,
    // Google OAuth only ever populates `user.email` — no separate
    // verification-request step like the old Resend/Email provider had.
    async signIn({ user }) {
      return isEmailAllowed(pool, user?.email);
    },
    // This runs on every session check, not just sign-in — must not hit
    // Postgres on the routine path (matters once Phase 3.4 has pages
    // calling auth() constantly).
    async jwt({ token, trigger, session }) {
      if (trigger === "signIn") {
        await ensureUserSettingsRow(pool, token.sub);
        token.onboardingCompleted = await getOnboardingStatus(pool, token.sub);
      } else if (trigger === "update") {
        // Trusts the caller (our own onboarding action, right after it
        // wrote the same value to Postgres) instead of re-reading the DB.
        token.onboardingCompleted =
          session?.user?.onboardingCompleted ?? token.onboardingCompleted;
      }
      return token;
    },
  },
});
