import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorkerRegister } from "@/components/service-worker";
import { AutoSync } from "@/components/auto-sync";
import { PushSync } from "@/components/push-sync";
import { CommandPalette } from "@/components/command-palette";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-serif",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "Track upcoming anime episodes, browse seasonal charts, and never miss a release. A calm, editorial anime tracker.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AniTrack",
    template: "%s · AniTrack",
  },
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  applicationName: "AniTrack",
  appleWebApp: { capable: true, title: "AniTrack", statusBarStyle: "default" },
  openGraph: {
    title: "AniTrack",
    description: DESCRIPTION,
    siteName: "AniTrack",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AniTrack",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#141310" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3/dist/tabler-icons.min.css"
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SiteHeader />
          <main className="mx-auto w-full max-w-page flex-1 px-5 sm:px-6">
            {children}
          </main>
          <SiteFooter />
          <ServiceWorkerRegister />
          <AutoSync />
          <PushSync />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
