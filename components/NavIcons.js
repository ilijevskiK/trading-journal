// Small line icons for the home screen's tiles — hand-drawn to match
// the app's existing original-SVG style (see components/diagrams/*), rather
// than pulling in an icon library for eight simple glyphs.

function Icon({ children, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 15 L4 19 M9 11 L9 19 M14 6 L14 19 M19 13 L19 19" />
    </Icon>
  );
}

export function JournalIcon(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <path d="M9 9 L15 9 M9 13 L15 13 M9 17 L12.5 17" />
    </Icon>
  );
}

export function BooksIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 6.5 C10.5 5.3 8 4.7 5 5 L5 17.5 C8 17.2 10.5 17.8 12 19 C13.5 17.8 16 17.2 19 17.5 L19 5 C16 4.7 13.5 5.3 12 6.5 Z" />
      <path d="M12 6.5 L12 19" />
    </Icon>
  );
}

export function StrategiesIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4.5 L12 2.5 M12 21.5 L12 19.5 M4.5 12 L2.5 12 M21.5 12 L19.5 12" />
    </Icon>
  );
}

export function WatchlistIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 12 C5.5 6.5 9 4.5 12 4.5 C15 4.5 18.5 6.5 21.5 12 C18.5 17.5 15 19.5 12 19.5 C9 19.5 5.5 17.5 2.5 12 Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icon>
  );
}

export function NewTradeIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8.5 L12 15.5 M8.5 12 L15.5 12" />
    </Icon>
  );
}

export function BreakdownsIcon(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 10 L20 10 M10.5 10 L10.5 20" />
    </Icon>
  );
}

export function Sp500Icon(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M7 15 L7 17 M11 12 L11 17 M15 9 L15 17" />
    </Icon>
  );
}

export function VideosIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M10 9.5 L15 12 L10 14.5 Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ScreenerIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 5 L20.5 5 L14 12.5 L14 18.5 L10 20 L10 12.5 Z" />
    </Icon>
  );
}

export function MarketStatusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 17 A8 8 0 0 1 20 17" />
      <path d="M12 17 L16 11" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
      <path d="M6.3 12.5 L7.4 13.3 M12 9 L12 10.4 M17.7 12.5 L16.6 13.3" />
    </Icon>
  );
}

export function CurrentEarningsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 19 L5 15 M9.5 19 L9.5 12 M14 19 L14 9 M18.5 19 L18.5 5" />
      <path d="M16.5 7 L18.5 5 L20.5 7" />
    </Icon>
  );
}

export function AnnualEarningsIcon(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
      <path d="M4 9.5 L20 9.5 M8.5 3.5 L8.5 7 M15.5 3.5 L15.5 7" />
      <path d="M8 16.5 L11 13.5 L13 15 L16.5 11.5" />
    </Icon>
  );
}

export function NewHighsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 18 L8 12 L11 14.5 L15 9 L17 11 L20 6" />
      <path d="M4 6 L20 6" strokeDasharray="2 2.5" />
      <circle cx="20" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SupplyDemandIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 4 L12 19 M8 19 L16 19 M5 7 L19 7" />
      <path d="M5 7 L2.5 13 L7.5 13 Z M19 7 L16.5 12 L21.5 12 Z" />
    </Icon>
  );
}

export function LeadershipIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 19 L9 11 L15 11 L15 19 M3.5 19 L3.5 14.5 L9 14.5 M15 16.5 L20.5 16.5 L20.5 19 M2.5 19 L21.5 19" />
      <path d="M12 3.5 L13 5.6 L15.2 5.9 L13.6 7.4 L14 9.6 L12 8.6 L10 9.6 L10.4 7.4 L8.8 5.9 L11 5.6 Z" />
    </Icon>
  );
}

export function InstitutionalIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 9 L12 4 L20.5 9 Z M4 19.5 L20 19.5 M5 17 L19 17" />
      <path d="M6.5 10.5 L6.5 15.5 M10 10.5 L10 15.5 M14 10.5 L14 15.5 M17.5 10.5 L17.5 15.5" />
    </Icon>
  );
}

export function SettingsIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5 L12 6 M12 18 L12 20.5 M3.5 12 L6 12 M18 12 L20.5 12 M6.1 6.1 L7.8 7.8 M16.2 16.2 L17.9 17.9 M6.1 17.9 L7.8 16.2 M16.2 7.8 L17.9 6.1" />
    </Icon>
  );
}
