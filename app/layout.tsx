import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signux AI — Operational Intelligence",
  description: "AI for global operators. Offshore, China Ops, Crypto OPSEC, Geopolitics, Languages.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body>{children}</body></html>);
}
