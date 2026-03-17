"use client";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { ClipboardCopy, Check, ExternalLink } from "lucide-react";

/* Format monetary values and percentages as bold */
function formatNumbers(text: string): ReactNode[] {
  // Match: $1,234.56 | R$5,678 | 15.5% | €1,000 | ¥500
  const regex = /([$€£¥₩][\d,.]+|R\$[\d,.]+|\d[\d,.]*%)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} style={{ fontWeight: 600 }}>{match[0]}</span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/* Code block with copy button */
function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute", top: 8, right: 8,
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 8px", borderRadius: 6,
          background: "var(--bg-tertiary)", border: "none",
          color: "var(--text-secondary)", cursor: "pointer",
          fontSize: 11, transition: "all 0.15s",
          opacity: 0.7,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
        aria-label="Copy code"
      >
        {copied ? <Check size={12} /> : <ClipboardCopy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <code className={className}>{children}</code>
    </div>
  );
}

/* Link detection: render URLs as mini cards */
function isStandaloneLink(children: ReactNode, href: string): boolean {
  if (typeof children === "string" && children === href) return true;
  if (Array.isArray(children) && children.length === 1 && typeof children[0] === "string" && children[0] === href) return true;
  return false;
}

function LinkCard({ href }: { href: string }) {
  let domain = "";
  try {
    domain = new URL(href).hostname.replace("www.", "");
  } catch {
    domain = href;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-primary)",
        background: "var(--bg-secondary)",
        textDecoration: "none", color: "var(--text-primary)",
        transition: "border-color 0.15s", marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10, color: "var(--text-tertiary)",
          letterSpacing: "0.03em", marginBottom: 2,
        }}>
          {domain}
        </div>
        <div style={{
          fontSize: 13, color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {href}
        </div>
      </div>
      <ExternalLink size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
    </a>
  );
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        components={{
          pre({ children }) {
            return <pre>{children}</pre>;
          },
          code({ children, className, ...props }) {
            const isInline = !className && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return <code {...props}>{children}</code>;
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          a({ href, children }) {
            if (href && isStandaloneLink(children, href)) {
              return <LinkCard href={href} />;
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          p({ children }) {
            // Process children to format numbers in text nodes
            const processed = processChildren(children);
            return <p>{processed}</p>;
          },
          li({ children }) {
            const processed = processChildren(children);
            return <li>{processed}</li>;
          },
          td({ children }) {
            const processed = processChildren(children);
            return <td>{processed}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* Process children nodes to format numbers in text */
function processChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return formatNumbers(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") {
        const parts = formatNumbers(child);
        return parts.length === 1 && typeof parts[0] === "string" ? child : <span key={i}>{parts}</span>;
      }
      return child;
    });
  }
  return children;
}
