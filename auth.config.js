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
    authorized({ auth, request }) {
      if (request.nextUrl.pathname === "/signin") return true;
      return Boolean(auth?.user);
    },
  },
};

export default authConfig;
