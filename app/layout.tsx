import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { LocalModeBanner } from "@/components/local-mode-banner";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Firsthand",
  description: "Request and publish firsthand reports from specific places.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} min-h-screen font-sans antialiased`}>
        <LocalModeBanner />
        <SiteHeader />
        <div className="pb-24 md:pb-0">{children}</div>
      </body>
    </html>
  );
}
