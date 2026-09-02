import { NextResponse } from "next/server";

// Edge-safe config — no adapter, no `pg` import. Used both by the full
// config in auth.js and, standalone, by middleware.js (which runs on the
// Edge runtime and can never touch the Postgres driver). See
// https://authjs.dev/guides/edge-compatibility for why the split exists.
const authConfig = {
  pages: {
    signIn: "/signin",
  },
  providers: [],
  callbacks: {
    // Auth.js's default session callback strips a JWT down to
    // { user: { name, email, image } } — id and our own custom claim have
    // to be re-added here explicitly, and this has to live in this
    // edge-safe file specifically: middleware.js builds its own separate
    // NextAuth(authConfig).auth instance, which never sees callbacks
    // defined only in auth.js.
    session({ session, token }) {
      session.user.id = token.sub;
      session.user.onboardingCompleted = token.onboardingCompleted;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/signin") return true;
      if (!auth?.user) return false;
      if (pathname === "/onboarding") return true;
      if (!auth.user.onboardingCompleted) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return true;
    },
  },
};

export default authConfig;
