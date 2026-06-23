import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
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

export const metadata: Metadata = {
  title: {
    default: "Solardash — India Solar & Renewables Research Terminal",
    template: "%s · Solardash",
  },
  description:
    "Buy-side equity research terminal for India's solar and renewable-energy sector: tenders & auctions, developers, manufacturing, capacity, demand, listed companies, and policy.",
  applicationName: "Solardash",
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
