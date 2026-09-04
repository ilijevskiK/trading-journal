"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function signInWithGoogle() {
  try {
    // Without an explicit redirectTo, this defaults to bouncing back to
    // whichever page the sign-in was initiated from (/signin) — which
    // middleware always allows through regardless of auth state, so a
    // successful sign-in would silently land back on the sign-in button
    // instead of the app.
    await signIn("google", { redirectTo: "/" });
  } catch (error) {
    // signIn() itself throws Next's internal redirect signal on success —
    // only AuthError (e.g. AccessDenied from the allowlist check) should be
    // caught and turned into a query param; anything else must propagate.
    if (error instanceof AuthError) {
      redirect(`/signin?error=${error.type}`);
    }
    throw error;
  }
}
