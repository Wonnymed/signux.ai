import Link from "next/link";
import { SignuxIcon } from "./components/SignuxIcon";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg-primary)", color: "var(--text-primary)",
      fontFamily: "var(--font-sans)",
    }}>
      <SignuxIcon variant="gold" size={48} />
      <div style={{
        fontFamily: "var(--font-brand)", fontSize: 44, fontWeight: 300,
        letterSpacing: "0.12em", marginTop: 16, marginBottom: 24,
      }}>
        404
      </div>
      <div style={{
        fontSize: 16, color: "var(--text-secondary)", marginBottom: 32,
      }}>
        Page not found
      </div>
      <Link
        href="/chat"
        style={{
          padding: "12px 28px", borderRadius: 50,
          background: "var(--accent)", color: "#000",
          fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}
      >
        Go to Signux AI
      </Link>
    </div>
  );
}
