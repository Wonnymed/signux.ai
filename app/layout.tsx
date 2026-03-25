import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: {
    default: "Octux AI — Decision Operating System",
    template: "%s — Octux AI",
  },
  description:
    "Beyond chat. Beyond consulting. Octux turns uncertainty into structured decisions.",
  metadataBase: new URL("https://octux-ai.vercel.app"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Octux AI — Decision Operating System",
    description:
      "10 specialist agents. Adversarial debate. Structured verdict. In 60 seconds.",
    url: "https://octux-ai.vercel.app",
    siteName: "Octux AI",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Octux AI — Decision Operating System",
    description:
      "10 specialist agents. Adversarial debate. Structured verdict. In 60 seconds.",
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
