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
      <SignuxIcon color="var(--accent)" size={48} />
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
          padding: "12px 28px", borderRadius: "var(--radius-pill)",
          background: "var(--text-primary)", color: "var(--text-inverse)",
          fontSize: 14, fontWeight: 500, textDecoration: "none",
          transition: "opacity 0.15s",
        }}
      >
        Go to Signux
      </Link>
    </div>
  );
}
