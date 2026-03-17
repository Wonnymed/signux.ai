import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signux AI — The AI that knows global business",
  description: "Offshore structures, China imports, crypto security, geopolitics. One AI that actually understands all of it.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Signux AI — The AI that knows global business",
    description: "Offshore structures, China imports, crypto security, geopolitics. One AI that actually understands all of it.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signux AI — The AI that knows global business",
    description: "Offshore structures, China imports, crypto security, geopolitics. One AI that actually understands all of it.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" dir="ltr"><body>{children}</body></html>);
}
