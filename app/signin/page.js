import { signInWithGoogle } from "./actions";

export default function SignInPage({ searchParams }) {
  const error = searchParams?.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink text-parchment font-body px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl tracking-wide text-gold-bright">Ledger</div>
          <div className="text-parchment-faint text-xs mt-1 tracking-wide uppercase">
            Trading Journal
          </div>
        </div>

        <form action={signInWithGoogle} className="bg-surface border border-line rounded-lg p-6">
          <button
            type="submit"
            className="w-full bg-gold text-ink px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gold-bright transition-colors"
          >
            Sign in with Google
          </button>
        </form>

        {error && (
          <p className="text-xs text-loss-bright mt-4 text-center">
            {error === "AccessDenied"
              ? "That email isn't on the allowlist yet."
              : "Something went wrong signing in — try again."}
          </p>
        )}
      </div>
    </div>
  );
}
