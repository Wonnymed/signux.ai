import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Signux AI",
};

export default function TermsPage() {
  return (
    <div style={{
      maxWidth: 720, margin: "0 auto", padding: "48px 24px",
      color: "var(--text-primary)", fontFamily: "var(--font-body)",
    }}>
      <Link href="/chat" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
        &larr; Back to Signux
      </Link>

      <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 32, fontWeight: 700, marginTop: 24, letterSpacing: 1 }}>
        Terms of Service
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 32 }}>
        Last updated: March 19, 2026
      </p>

      <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-secondary)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Signux AI (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
          If you do not agree, do not use the Service.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>2. Description of Service</h2>
        <p>
          Signux AI is an operational intelligence platform that provides AI-powered business analysis,
          simulations, research, and decision support tools. The Service is provided &quot;as is&quot; and
          is not a substitute for professional legal, financial, or tax advice.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>3. Prohibited Uses</h2>
        <p>You agree NOT to:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
          <li>Use the Service to build a competing product or service</li>
          <li>Scrape, crawl, or perform automated extraction of any content, data, or functionality</li>
          <li>Attempt to discover the underlying algorithms, prompts, or system architecture</li>
          <li>Share, publish, or distribute any proprietary methodology discovered through use</li>
          <li>Use automated tools, bots, or scripts to access the Service</li>
          <li>Circumvent rate limits, authentication mechanisms, or security controls</li>
          <li>Use the Service for any illegal activity or to harm others</li>
          <li>Attempt prompt injection, jailbreaking, or manipulation of AI system instructions</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>4. Intellectual Property</h2>
        <p>
          All system prompts, agent architectures, simulation methodologies, scoring algorithms,
          and proprietary workflows are trade secrets of Signux AI. Unauthorized reproduction,
          distribution, or use is subject to legal action under applicable intellectual property
          and trade secret laws.
        </p>
        <p>
          The Service&apos;s user interface, branding, design elements, and compiled code are protected
          by copyright. You may not copy, modify, or create derivative works without written permission.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>5. User Content</h2>
        <p>
          You retain ownership of content you submit to the Service. By using the Service, you grant
          Signux AI a limited license to process your content solely for the purpose of providing
          the Service. We do not use your content to train AI models.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>6. Disclaimer of Warranties</h2>
        <p>
          The Service is provided &quot;AS IS&quot; without warranties of any kind. Signux AI does not guarantee
          the accuracy, completeness, or reliability of any analysis, simulation, or recommendation.
          AI-generated content may contain errors. Always verify critical information independently
          and consult qualified professionals for legal, financial, and tax decisions.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>7. Limitation of Liability</h2>
        <p>
          Signux AI shall not be liable for any indirect, incidental, special, consequential, or
          punitive damages arising from your use of the Service, including but not limited to
          financial losses based on AI-generated analysis or recommendations.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>8. Account Security</h2>
        <p>
          You are responsible for maintaining the security of your account credentials. Notify us
          immediately of any unauthorized access. We reserve the right to suspend accounts that
          violate these terms or exhibit suspicious activity.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>9. Modifications</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the Service
          after changes constitutes acceptance of the updated terms.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginTop: 32 }}>10. Contact</h2>
        <p>
          For questions about these terms, contact us at legal@signux.ai.
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
