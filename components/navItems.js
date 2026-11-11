import {
  DashboardIcon,
  JournalIcon,
  BooksIcon,
  StrategiesIcon,
  Sp500Icon,
  VideosIcon,
  WatchlistIcon,
  NewTradeIcon,
  BreakdownsIcon,
  SettingsIcon,
} from "@/components/NavIcons";

// The sections shown as tiles on the home screen, in display order.
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/journal", label: "Journal", Icon: JournalIcon },
  { href: "/breakdowns", label: "Breakdowns", Icon: BreakdownsIcon },
  { href: "/books", label: "Books", Icon: BooksIcon },
  { href: "/strategies", label: "Strategies", Icon: StrategiesIcon },
  { href: "/sp500", label: "S&P 500", Icon: Sp500Icon },
  { href: "/videos", label: "Videos", Icon: VideosIcon },
  { href: "/watchlist", label: "Watchlist", Icon: WatchlistIcon },
  { href: "/new", label: "New Trade", Icon: NewTradeIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];
