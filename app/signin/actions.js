"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function signInWithEmail(formData) {
  try {
    await signIn("resend", formData);
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
