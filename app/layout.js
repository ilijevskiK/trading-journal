import "./globals.css";
import { TradesProvider } from "@/contexts/TradesContext";
import NavShell from "@/components/NavShell";

export const metadata = {
  title: "Ledger — Trading Journal",
  description: "A discipline-first trading journal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TradesProvider>
          <NavShell>{children}</NavShell>
        </TradesProvider>
      </body>
    </html>
  );
}
