import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { Footer } from "@/components/layout/Footer";
import { ThemeScript } from "@/components/theme/theme-script";

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
  "Buy-side intelligence for India's solar & renewable-energy sector: tenders & auctions, developers, manufacturing, capacity, demand, listed companies, and policy.";

export const metadata: Metadata = {
  title: {
    default: "Solardash — India Solar Sector Intelligence",
    template: "%s · Solardash",
  },
  description: DESCRIPTION,
  applicationName: "Solardash",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Solardash — India Solar Sector Intelligence",
    description: DESCRIPTION,
    siteName: "Solardash",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Solardash — India Solar Sector Intelligence",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeScript />
        <AppShell footer={<Footer />}>{children}</AppShell>
      </body>
    </html>
  );
}
