"use client";
import React from "react";

interface MarkdownResultProps {
  content: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseInline(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) {
      nodes.push(line.slice(last, match.index));
    }
    if (match[2]) {
      nodes.push(
        <strong key={match.index} style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      nodes.push(
        <code
          key={match.index}
          style={{
            background: "var(--bg-secondary)",
            fontFamily: "var(--font-mono)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: "0.9em",
          }}
        >
          {match[4]}
        </code>
      );
    } else if (match[6] && match[7]) {
      nodes.push(
        <a
          key={match.index}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#60A5FA", textDecoration: "none" }}
        >
          {match[6]}
        </a>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < line.length) {
    nodes.push(line.slice(last));
  }

  return nodes.length > 0 ? nodes : [line];
}

export default function MarkdownResult({ content }: MarkdownResultProps) {
  if (!content || typeof content !== "string") return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          style={{
            background: "var(--bg-secondary)",
            padding: 16,
            borderRadius: 8,
            overflow: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-secondary)",
            margin: "12px 0",
            border: "1px solid var(--border-primary)",
          }}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h4
          key={`h3-${i}`}
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: "16px 0 6px",
          }}
        >
          {parseInline(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={`h2-${i}`}
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: "20px 0 8px",
          }}
        >
          {parseInline(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2
          key={`h1-${i}`}
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: "20px 0 10px",
          }}
        >
          {parseInline(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableRows.push(lines[i]);
        i++;
      }
      // Filter separator rows
      const dataRows = tableRows.filter((r) => !/^\|[\s-:|]+\|$/.test(r.trim()));
      if (dataRows.length > 0) {
        const parseRow = (row: string) =>
          row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim());

        elements.push(
          <div key={`table-${i}`} style={{ overflow: "auto", margin: "12px 0" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri}>
                    {parseRow(row).map((cell, ci) => {
                      const Tag = ri === 0 ? "th" : "td";
                      return (
                        <Tag
                          key={ci}
                          style={{
                            padding: 8,
                            border: "1px solid var(--border-primary)",
                            textAlign: "left",
                            fontWeight: ri === 0 ? 500 : 400,
                            color: ri === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                          }}
                        >
                          {parseInline(cell)}
                        </Tag>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*]\s/, ""));
        i++;
      }
      elements.push(
        <ul
          key={`ul-${i}`}
          style={{
            margin: "8px 0",
            paddingLeft: 16,
            listStyleType: "none",
          }}
        >
          {items.map((item, j) => (
            <li
              key={j}
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                padding: "2px 0",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--text-tertiary)", marginTop: 2, flexShrink: 0 }}>
                &bull;
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s/, ""));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          style={{
            margin: "8px 0",
            paddingLeft: 16,
            listStyleType: "none",
            counterReset: "md-counter",
          }}
        >
          {items.map((item, j) => (
            <li
              key={j}
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                padding: "2px 0",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-tertiary)",
                  minWidth: 16,
                  marginTop: 2,
                  flexShrink: 0,
                }}
              >
                {j + 1}.
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p
        key={`p-${i}`}
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          margin: "8px 0",
        }}
      >
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div
      style={{
        padding: "20px 24px",
        borderRadius: 10,
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      {elements}
    </div>
  );
}
