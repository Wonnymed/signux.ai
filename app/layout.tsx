import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import InstallPrompt from "./components/InstallPrompt";

export const metadata: Metadata = {
  title: "Signux AI — Think through any business decision",
  description: "AI-powered operational intelligence platform with 6 specialized modes: Chat, Simulate, Research, Launchpad, Global Ops, and Invest.",
  metadataBase: new URL("https://signux-ai.vercel.app"),
  icons: {
    icon: [
      { url: "/icons/signux-icon-gold-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Signux AI",
    description: "Think through any business decision before you make it",
    url: "https://signux-ai.vercel.app",
    siteName: "Signux AI",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signux AI",
    description: "Think through any business decision before you make it",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#D4AF37" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Rajdhani:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
