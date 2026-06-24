import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { Footer } from "@/components/layout/Footer";
import { ThemeScript } from "@/components/theme/theme-script";
import { getSearchIndex } from "@/data/search";

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
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeScript />
        <AppShell footer={<Footer />} searchIndex={searchIndex}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
