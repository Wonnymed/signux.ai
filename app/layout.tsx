import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import MotionProvider from "@/components/providers/MotionProvider";
import ThemeInitializer from "@/components/theme/ThemeInitializer";
import StorageMigration from "@/components/StorageMigration";
import { cn } from "@/lib/design/cn";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sora",
  display: "swap",
});

const themeInitScript = `
(function() {
  try {
    var mode = localStorage.getItem('sukgo:theme') || localStorage.getItem('octux:theme') || localStorage.getItem('sukgo_theme') || localStorage.getItem('octux_theme') || 'system';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: {
    default: "Sukgo — The World's First AI Business Simulation Engine",
    template: "%s — Sukgo AI",
  },
  description:
    "Simulate any business decision with 10 AI specialists debating in real time. 1,000 market voices validate demand. 4 modes. Verdict in 60 seconds. Free to start.",
  keywords: [
    "AI business simulation",
    "business decision AI",
    "simulate business idea",
    "multi-agent AI debate",
    "startup validation AI",
    "pre-mortem AI",
    "business stress test",
  ],
  metadataBase: new URL("https://sukgo.ai"),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Sukgo — The World's First AI Business Simulation Engine",
    description:
      "Before Sukgo, there was no way to simulate a business decision with AI. Now there is.",
    url: "https://sukgo.ai",
    siteName: "Sukgo AI",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sukgo — The World's First AI Business Simulation Engine",
    description:
      "Before Sukgo, there was no way to simulate a business decision with AI. Now there is.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#09090b" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          "min-h-dvh font-sans antialiased bg-surface-0 text-txt-primary transition-colors duration-200",
          sora.variable,
        )}
      >
        <StorageMigration />
        <ThemeInitializer />
        <MotionProvider>
          <AuthProvider>{children}</AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
