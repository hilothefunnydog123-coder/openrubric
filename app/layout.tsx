import type { Metadata } from "next";
import { Newsreader, Geist, Geist_Mono } from "next/font/google";
import { DemoProvider } from "@/components/app/demo-store";
import "./globals.css";

// Editorial serif — landing headlines only.
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-serif",
  display: "swap",
});

// Geist — the UI typeface (modern, infrastructure-grade). Variable weight.
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Geist Mono — labels, metadata, scores, tables.
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "OpenRubric — Open judging infrastructure for fairer hackathons",
    template: "%s · OpenRubric",
  },
  description:
    "OpenRubric is a nonprofit, open-source hackathon judging system. Import Devpost submissions, paste a rubric, invite judges, score projects live, review GitHub commit timelines, and publish track winners transparently.",
  keywords: [
    "hackathon judging",
    "open source",
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
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
