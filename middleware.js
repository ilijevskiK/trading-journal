import NextAuth from "next-auth";
import authConfig from "./auth.config";

// A second, adapter-less NextAuth instance built only from the edge-safe
// config — this is what actually runs on the Edge runtime. The real
// gate is auth.config.js's `authorized` callback.
// Exported bare (not wrapped in a handler function) so the `authorized`
// callback in auth.config.js is what actually decides access — wrapping it
// in a custom function here would override that and let everything through.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
