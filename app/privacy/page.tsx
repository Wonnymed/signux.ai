import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 720, margin: "0 auto", padding: "48px 24px",
      color: "var(--text-primary)", fontFamily: "var(--font-body)",
    }}>
      <Link href="/chat" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
        &larr; Back to Signux
      </Link>

      <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 32, fontWeight: 700, marginTop: 24, letterSpacing: 1 }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 32 }}>
        Last updated: March 24, 2026
      </p>

      <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-secondary)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>1. Information We Collect</h2>
        <p>
          When you use Signux AI (&quot;the Service&quot;), we collect information necessary to provide and improve the Service:
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Account information</strong> — email address, name, and authentication credentials when you create an account.</li>
          <li><strong>Usage data</strong> — interactions with the Service, including queries submitted, features used, and session metadata.</li>
          <li><strong>Device information</strong> — browser type, operating system, and device identifiers for security and compatibility purposes.</li>
          <li><strong>Payment information</strong> — processed securely through Stripe. We do not store credit card numbers on our servers.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li>Provide, maintain, and improve the Service</li>
          <li>Process transactions and manage your account</li>
          <li>Communicate with you about the Service, updates, and support</li>
          <li>Detect and prevent fraud, abuse, or security incidents</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>3. Your Content</h2>
        <p>
          Content you submit to Signux AI (queries, scenarios, business context) is processed solely to generate your analysis results.
          We do <strong>not</strong> use your content to train AI models. Your business data remains yours.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>4. Data Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Service providers</strong> — infrastructure (Vercel, Supabase), payments (Stripe), and AI processing (Anthropic) — only as necessary to operate the Service.</li>
          <li><strong>Legal compliance</strong> — when required by law, subpoena, or to protect the rights, property, or safety of Signux AI and its users.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>5. Data Security</h2>
        <p>
          We implement industry-standard security measures including encryption in transit (TLS), encrypted storage,
          and strict access controls. While no system is perfectly secure, we take the protection of your data seriously.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>6. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. You may request deletion of your account
          and associated data at any time by contacting us. Certain data may be retained as required by law or for
          legitimate business purposes (such as fraud prevention).
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li>Access the personal data we hold about you</li>
          <li>Request correction or deletion of your data</li>
          <li>Object to or restrict processing of your data</li>
          <li>Export your data in a portable format</li>
        </ul>
        <p>
          To exercise these rights, contact us at privacy@signux.ai.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>8. Cookies and Local Storage</h2>
        <p>
          We use essential cookies and local storage for authentication, theme preferences, and session management.
          We do not use third-party advertising or tracking cookies.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting
          the updated policy on this page with a revised &quot;Last updated&quot; date.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>10. Contact</h2>
        <p>
          For questions about this privacy policy or your data, contact us at privacy@signux.ai.
        </p>
      </div>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border-primary)" }}>
        <Link href="/chat" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
          &larr; Back to Signux
        </Link>
      </div>
    </div>
  );
}
