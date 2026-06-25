import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeScript } from "@/components/theme/theme-script";
import { getSearchIndex } from "@/data/search";
import { getCompaniesSnapshot, getProvenance } from "@/data";
import { formatDate } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const DESCRIPTION =
  "Munshot's Solar Sector Dashboard — buy-side intelligence for India's solar & renewable-energy sector: tenders & auctions, developers, manufacturing, capacity, demand, listed companies, and policy.";

export const metadata: Metadata = {
  title: {
    default: "Solar Sector Dashboard — Munshot",
    template: "%s · Solar Sector Dashboard",
  },
  description: DESCRIPTION,
  applicationName: "Solar Sector Dashboard",
  openGraph: {
    title: "Solar Sector Dashboard — Munshot",
    description: DESCRIPTION,
    siteName: "Solar Sector Dashboard",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Solar Sector Dashboard — Munshot",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Build the command-palette index once at build time (server) and hand it to
  // the client shell as a prop — same server→client pattern as the footer.
  const searchIndex = getSearchIndex();
  // Real data-as-of = max updatedAt across every snapshot (same source the
  // footer/overview use). Format server-side so the client TopBar renders a
  // fixed string — no timezone-dependent re-format, no hydration drift.
  const updatedAt = getProvenance().reduce(
    (m, p) => (p.updatedAt > m ? p.updatedAt : m),
    "",
  );
  const dataAsOf = updatedAt ? formatDate(updatedAt) : undefined;
  const companyCount = getCompaniesSnapshot().data.companies.length;
  const sectionCount = getProvenance().length;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeScript />
        <AppShell
          searchIndex={searchIndex}
          dataAsOf={dataAsOf}
          companyCount={companyCount}
          sectionCount={sectionCount}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
