import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import InstallPrompt from "./components/InstallPrompt";

export const metadata: Metadata = {
  title: {
    default: "Signux AI — Decision Operating System",
    template: "%s — Signux AI",
  },
  description: "Beyond chat and beyond consulting. Signux turns uncertainty into structured decisions for founders, operators, and investors.",
  metadataBase: new URL("https://signux-ai.vercel.app"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Signux AI — Beyond Chat. Beyond Consulting.",
    description: "A new decision layer for founders, operators, and investors. Simulate, build, grow, hire, protect, compete.",
    url: "https://signux-ai.vercel.app",
    siteName: "Signux AI",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signux AI — Beyond Chat. Beyond Consulting.",
    description: "A new decision layer for founders, operators, and investors.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090B" media="(prefers-color-scheme: dark)" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Rajdhani:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("signux-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");document.documentElement.style.colorScheme="light"}else if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");document.documentElement.style.colorScheme="dark"}else{var m=window.matchMedia("(prefers-color-scheme:light)").matches;document.documentElement.style.colorScheme=m?"light":"dark"}}catch(e){document.documentElement.style.colorScheme="dark"}})()` }} />
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
