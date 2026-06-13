import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { Analytics, AnalyticsNoScript } from "@/components/analytics/Analytics";
import { getSiteBaseUrl, siteOrganizationJsonLd } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: "KOORAKIT — The Global Football Festival",
  description:
    "KOORAKIT is your home for the global football festival: live match streaming, the 2026 tournament match center, standings, and football news.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsNoScript />
        <Analytics />
        <JsonLd data={siteOrganizationJsonLd()} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
