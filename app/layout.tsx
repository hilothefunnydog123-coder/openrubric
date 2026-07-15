import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { DemoProvider } from "@/components/app/demo-store";
import { TranslateWidget } from "@/components/app/translate-widget";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

// Editorial display serif, headlines only. Variable optical size means it
// sharpens at text sizes and gains contrast + character at display sizes.
const serif = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

// Geist, the UI typeface (modern, infrastructure-grade). Variable weight.
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Geist Mono, labels, metadata, scores, tables.
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production" ? "https://openrubric.vercel.app" : "http://localhost:3000")
).replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "OpenRubric · Open judging infrastructure for fairer hackathons",
    template: "%s · OpenRubric",
  },
  description:
    "OpenRubric is a hackathon judging system. Import Devpost submissions, paste a rubric, invite judges, score projects live, review GitHub commit timelines, and publish track winners transparently.",
  keywords: [
    "hackathon judging",
    "rubric",
    "Devpost",
    "judging infrastructure",
    "fair judging",
  ],
  openGraph: {
    title: "OpenRubric",
    description: "Open judging infrastructure for fairer hackathons.",
    url: APP_URL,
    siteName: "OpenRubric",
    type: "website",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly, password managers)
          inject attributes onto <body> before hydration, harmless, but noisy. */}
      <body suppressHydrationWarning>
        <SessionProvider>
          <DemoProvider>{children}</DemoProvider>
        </SessionProvider>
        <TranslateWidget />
      </body>
    </html>
  );
}
