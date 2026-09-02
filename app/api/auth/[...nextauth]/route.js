import { handlers } from "@/auth";

// No `export const runtime = "edge"` here — this must stay on the default
// Node.js runtime, since auth.js's Postgres adapter uses the `pg` driver.
export const { GET, POST } = handlers;
