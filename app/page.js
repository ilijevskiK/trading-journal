"use client";

import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/components/navItems";
import Tile from "@/components/Tile";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-20">
      <header className="text-center">
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-gold-bright">Ledger</h1>
        <p className="text-parchment-faint text-xs mt-2 tracking-wide uppercase">Trading Journal</p>
        <div className="rule-divider mt-8 max-w-xs mx-auto" />
      </header>

      <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-10">
        {NAV_ITEMS.map((item) => (
          <Tile key={item.href} {...item} />
        ))}
      </nav>

      <footer className="mt-12 text-center text-parchment-faint text-xs leading-relaxed">
        Every position sized before it&apos;s entered. Every exit decided before it&apos;s felt.
        <button onClick={() => signOut()} className="block mx-auto mt-3 hover:text-loss-bright">
          Sign out
        </button>
      </footer>
    </div>
  );
}
