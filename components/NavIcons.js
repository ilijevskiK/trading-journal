// Small line icons for the sidebar's minimized state — hand-drawn to match
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

export function IndicatorsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 13 L8 13 L10 8 L13 17 L15 13 L20 13" />
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

export function ReviewIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 16 L9.5 10.5 L13 14 L20 6" />
      <path d="M14.5 6 L20 6 L20 11.5" />
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

export function SettingsIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5 L12 6 M12 18 L12 20.5 M3.5 12 L6 12 M18 12 L20.5 12 M6.1 6.1 L7.8 7.8 M16.2 16.2 L17.9 17.9 M6.1 17.9 L7.8 16.2 M16.2 7.8 L17.9 6.1" />
    </Icon>
  );
}
