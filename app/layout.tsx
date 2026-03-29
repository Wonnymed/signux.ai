import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import MotionProvider from "@/components/providers/MotionProvider";
import ThemeInitializer from "@/components/theme/ThemeInitializer";

const themeInitScript = `
(function() {
  try {
    var mode = localStorage.getItem('sukgo:theme') || localStorage.getItem('octux:theme') || localStorage.getItem('signux-theme') || 'system';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: {
    default: "Sukgo — The World's First AI Business Simulation Engine",
    template: "%s — Sukgo",
  },
  description:
    "Simulate any business decision with 10 AI specialists debating in real time.",
  metadataBase: new URL("https://signux-ai.vercel.app"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Sukgo — The World's First AI Business Simulation Engine",
    description:
      "Simulate any business decision with 10 AI specialists debating in real time.",
    url: "https://signux-ai.vercel.app",
    siteName: "Sukgo",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sukgo — The World's First AI Business Simulation Engine",
    description:
      "Simulate any business decision with 10 AI specialists debating in real time.",
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
        <meta name="theme-color" content="#0F0F13" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Sora:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh font-sans antialiased bg-surface-0 text-txt-primary transition-colors duration-200">
        <ThemeInitializer />
        <MotionProvider>
          <AuthProvider>{children}</AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
