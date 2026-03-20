// Run: npx tsx scripts/run-evals.ts

const EVAL_DATASET = [
  {
    domain: "game-theory",
    question: "My competitor just dropped prices by 20%. Should I match them?",
    expectedTopics: ["Nash equilibrium", "price war", "differentiation", "market share"],
  },
  {
    domain: "risk-intel",
    question: "I'm signing a partnership with a company in China. What risks should I watch for?",
    expectedTopics: ["geopolitical risk", "IP protection", "regulatory", "currency risk", "sanctions"],
  },
  {
    domain: "pricing-economics",
    question: "How should I price my SaaS at $29/month vs $49/month?",
    expectedTopics: ["elasticity", "willingness to pay", "anchoring", "value-based pricing"],
  },
  {
    domain: "negotiation",
    question: "I have a funding meeting tomorrow. How do I negotiate the best terms?",
    expectedTopics: ["BATNA", "anchoring", "information asymmetry", "deal structure"],
  },
  {
    domain: "deception-detection",
    question: "This partnership offer promises 50% revenue share. Is it too good to be true?",
    expectedTopics: ["red flags", "hidden costs", "misaligned incentives", "due diligence"],
  },
];

async function runEvals() {
  console.log("Running Signux AI Quality Evals...\n");

  const results: any[] = [];

  for (const test of EVAL_DATASET) {
    console.log(`Testing: ${test.domain} — "${test.question.slice(0, 60)}..."`);

    try {
      const res = await fetch("http://localhost:3000/api/eval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify(test),
      });

      const result = await res.json();
      results.push(result);

      console.log(`  Scores: Accuracy=${result.scores.accuracy} Relevance=${result.scores.relevance} Depth=${result.scores.depth} Action=${result.scores.actionability} Domain=${result.scores.domain_usage} OVERALL=${result.scores.overall}`);

      if (result.scores.issues?.length > 0) {
        console.log(`  Issues: ${result.scores.issues.join(", ")}`);
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
    }

    console.log("");
  }

  const avg = (field: string) => results.reduce((sum, r) => sum + (r.scores?.[field] || 0), 0) / results.length;
  console.log("=== SUMMARY ===");
  console.log(`Average Accuracy: ${avg("accuracy").toFixed(1)}/10`);
  console.log(`Average Relevance: ${avg("relevance").toFixed(1)}/10`);
  console.log(`Average Depth: ${avg("depth").toFixed(1)}/10`);
  console.log(`Average Actionability: ${avg("actionability").toFixed(1)}/10`);
  console.log(`Average Domain Usage: ${avg("domain_usage").toFixed(1)}/10`);
  console.log(`OVERALL: ${avg("overall").toFixed(1)}/10`);
}

runEvals();
