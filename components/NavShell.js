"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TILE_CLASS, TILE_LABEL_CLASS, TILE_UNDERLINE_CLASS } from "@/components/tileStyles";

// The home screen's tiles are the app's only navigation, so every other
// page just gets a way back to them instead of a sidebar.
export default function NavShell({ children }) {
  const pathname = usePathname();

  // Sign-in and onboarding render their own full-page layouts.
  if (pathname === "/signin" || pathname === "/onboarding") return children;
  if (pathname === "/") {
    return <div className="min-h-screen bg-ink text-parchment font-body">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-ink text-parchment font-body">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-10 pt-6">
        <Link href="/" className={`${TILE_CLASS} inline-flex items-center gap-2.5 px-4 py-2.5`}>
          <span
            aria-hidden="true"
            className="text-base leading-none text-parchment-faint transition duration-200 ease-out group-hover:text-gold group-focus-visible:text-gold motion-safe:group-hover:-translate-x-1 motion-safe:group-focus-visible:-translate-x-1"
          >
            ←
          </span>
          <span className={`${TILE_LABEL_CLASS} text-sm`}>
            Home
            <span aria-hidden="true" className={TILE_UNDERLINE_CLASS} />
          </span>
        </Link>
      </div>
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
