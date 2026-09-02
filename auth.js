import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import authConfig from "./auth.config";
import pool from "@/lib/db";
import { isEmailAllowed } from "@/lib/allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
  // Required because an adapter alone would otherwise default toward
  // database sessions, which the Edge middleware can't read (no `pg` there).
  session: { strategy: "jwt" },
  providers: [Resend({ from: process.env.AUTH_EMAIL_FROM })],
  callbacks: {
    ...authConfig.callbacks,
    // Fires twice for the email provider: once at magic-link request time
    // (email.verificationRequest === true) and once when the link is
    // clicked. Checked both times — rejecting at request time means a
    // non-allowlisted address never even gets an email sent.
    async signIn({ user, email }) {
      const candidate = email?.address || email?.email || user?.email;
      return isEmailAllowed(pool, candidate);
    },
  },
});
