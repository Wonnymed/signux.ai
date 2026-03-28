"use client";

const ROWS = [
  {
    dimension: "Agents",
    chatgpt: "1 (GPT)",
    claude: "1 (Claude)",
    octux: "10 specialists + Chair",
  },
  {
    dimension: "Output",
    chatgpt: "Free text",
    claude: "Free text",
    octux: "Structured verdict",
  },
  {
    dimension: "Self-eval",
    chatgpt: "None",
    claude: "Limited",
    octux: "Grade A–F + metrics",
  },
  {
    dimension: "Audit trail",
    chatgpt: "None",
    claude: "Thinking mode",
    octux: "Full trace + citations",
  },
  {
    dimension: "Progress",
    chatgpt: "Spinner",
    claude: '"Thinking..."',
    octux: "Phase-by-phase live",
  },
  {
    dimension: "Learning",
    chatgpt: "Static",
    claude: "Basic memory",
    octux: "Self-evolving system",
  },
];

const WEAK = "rgba(255,255,255,0.50)";
const DIM_LABEL = "rgba(255,255,255,0.70)";
const PURPLE = "#6B6560";
const OCTUX_BG = "rgba(124,58,237,0.08)";
const BORDER_ROW = "rgba(255,255,255,0.08)";
const BORDER_HEADER = "rgba(255,255,255,0.10)";

export default function WhySukgo() {
  return (
    <section
      style={{
        width: "100%",
        background: "linear-gradient(180deg, #0F0A1A 0%, #1A0F2E 100%)",
        padding: "96px 24px",
      }}
    >
      {/* Title */}
      <h2
        style={{
          fontSize: 28,
          fontWeight: 300,
          color: "#FFFFFF",
          lineHeight: 1.3,
          textAlign: "center",
          margin: "0 auto 56px",
          maxWidth: 640,
        }}
      >
        ChatGPT gives you an answer.{" "}
        <span style={{ color: PURPLE }}>Sukgo gives you a decision.</span>
      </h2>

      {/* Table container */}
      <div
        className="why-octux-scroll"
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 560,
          }}
        >
          {/* Header */}
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER_HEADER}` }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "0 16px 16px 0",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  width: "22%",
                }}
              />
              <th
                style={{
                  textAlign: "left",
                  padding: "0 16px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: WEAK,
                  width: "26%",
                }}
              >
                ChatGPT
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "0 16px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: WEAK,
                  width: "26%",
                }}
              >
                Claude
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "0 16px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: PURPLE,
                  width: "26%",
                }}
              >
                Sukgo
              </th>
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.dimension}
                style={{
                  borderBottom:
                    i < ROWS.length - 1
                      ? `1px solid ${BORDER_ROW}`
                      : "none",
                }}
              >
                {/* Dimension */}
                <td
                  style={{
                    padding: "16px 16px 16px 0",
                    fontSize: 14,
                    fontWeight: 500,
                    color: DIM_LABEL,
                  }}
                >
                  {row.dimension}
                </td>

                {/* ChatGPT */}
                <td
                  style={{
                    padding: "16px",
                    fontSize: 14,
                    fontWeight: 400,
                    color: WEAK,
                  }}
                >
                  {row.chatgpt}
                </td>

                {/* Claude */}
                <td
                  style={{
                    padding: "16px",
                    fontSize: 14,
                    fontWeight: 400,
                    color: WEAK,
                  }}
                >
                  {row.claude}
                </td>

                {/* Sukgo — highlighted */}
                <td
                  style={{
                    padding: "16px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#FFFFFF",
                    background: OCTUX_BG,
                    borderLeft: `2px solid ${PURPLE}`,
                  }}
                >
                  {row.octux}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .why-octux-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .why-octux-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .why-octux-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 999px;
        }
      `}</style>
    </section>
  );
}
