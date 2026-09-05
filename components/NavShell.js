"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  DashboardIcon,
  JournalIcon,
  IndicatorsIcon,
  BooksIcon,
  StrategiesIcon,
  Sp500Icon,
  VideosIcon,
  WatchlistIcon,
  NewTradeIcon,
  BreakdownsIcon,
  ReviewIcon,
  SettingsIcon,
} from "@/components/NavIcons";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", mark: "01", Icon: DashboardIcon },
  { href: "/journal", label: "Journal", mark: "02", Icon: JournalIcon },
  { href: "/breakdowns", label: "Breakdowns", mark: "03", Icon: BreakdownsIcon },
  { href: "/review", label: "Review", mark: "04", Icon: ReviewIcon },
  { href: "/indicators", label: "Indicators", mark: "05", Icon: IndicatorsIcon },
  { href: "/books", label: "Books", mark: "06", Icon: BooksIcon },
  { href: "/strategies", label: "Strategies", mark: "07", Icon: StrategiesIcon },
  { href: "/sp500", label: "S&P 500", mark: "08", Icon: Sp500Icon },
  { href: "/videos", label: "Videos", mark: "09", Icon: VideosIcon },
  { href: "/watchlist", label: "Watchlist", mark: "10", Icon: WatchlistIcon },
  { href: "/new", label: "New Trade", mark: "11", Icon: NewTradeIcon },
  { href: "/settings", label: "Settings", mark: "12", Icon: SettingsIcon },
];

const COLLAPSED_KEY = "tj_sidebar_collapsed_v1";

export default function NavShell({ children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      if (raw != null) setCollapsed(raw === "true");
    } catch (e) {
      // localStorage unavailable — just keep the default expanded state
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch (e) {
        // ignore — collapse still works for this session, just won't persist
      }
      return next;
    });
  }

  // The sign-in page renders its own full-page layout and has no nav to
  // show — an unauthenticated visitor shouldn't see links to pages they
  // can't reach anyway.
  if (pathname === "/signin" || pathname === "/onboarding") return children;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ink text-parchment font-body">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-surface">
        <span className="font-display text-lg tracking-wide text-gold-bright">
          Ledger
        </span>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-parchment-dim border border-line rounded px-3 py-1.5 text-sm"
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-surface border-b border-line px-4 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-2.5 text-sm border-b border-line/60 last:border-none ${
                pathname === item.href ? "text-gold-bright" : "text-parchment-dim"
              }`}
            >
              <span className="font-mono text-xs mr-2 opacity-60">{item.mark}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex md:flex-col md:shrink-0 bg-surface border-r border-line relative transition-[width] duration-150 ${
          collapsed ? "md:w-[68px]" : "md:w-60"
        }`}
      >
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex absolute -right-3 top-9 z-10 w-6 h-6 items-center justify-center rounded-full bg-surface-alt border border-line text-parchment-faint hover:text-parchment hover:border-gold-dim transition-colors"
        >
          <span className={`text-xs leading-none transition-transform ${collapsed ? "rotate-180" : ""}`}>
            ‹
          </span>
        </button>

        <div className={`pt-8 pb-6 ${collapsed ? "px-0 flex flex-col items-center" : "px-6"}`}>
          {collapsed ? (
            <div className="font-display text-2xl text-gold-bright leading-none">L</div>
          ) : (
            <>
              <div className="font-display text-2xl tracking-wide text-gold-bright leading-none">
                Ledger
              </div>
              <div className="text-parchment-faint text-xs mt-1 tracking-wide uppercase">
                Trading Journal
              </div>
              <div className="text-parchment-faint text-[10px] mt-1 font-mono">v1.1.0</div>
            </>
          )}
        </div>
        <div className={collapsed ? "rule-divider mx-3" : "rule-divider mx-6"} />
        <nav className={`flex-1 pt-4 ${collapsed ? "px-2" : "px-3"}`}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center rounded-md mb-1 transition-colors ${
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-surface-alt text-gold-bright"
                    : "text-parchment-dim hover:text-parchment hover:bg-surface-alt/60"
                }`}
              >
                {collapsed ? (
                  <item.Icon className={`w-5 h-5 shrink-0 ${active ? "text-gold" : "text-parchment-faint"}`} />
                ) : (
                  <>
                    <span
                      className={`font-mono text-xs ${active ? "text-gold" : "text-parchment-faint"}`}
                    >
                      {item.mark}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>
        {!collapsed && (
          <div className="px-6 py-5 text-parchment-faint text-xs leading-relaxed border-t border-line">
            Every position sized before it&apos;s entered.
            <br />
            Every exit decided before it&apos;s felt.
            <button
              onClick={() => signOut()}
              className="block mt-3 text-parchment-faint hover:text-loss-bright"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
