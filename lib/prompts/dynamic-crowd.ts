import type { CrowdSegment } from '@/lib/simulation/types';

export function buildCrowdSegmentPrompt(
  segment: CrowdSegment,
  question: string,
  expertSummary?: string,
): string {
  return `Simulate ${segment.count} real people from:
"${segment.segment}"

Behavior: ${segment.behavior}
Context: ${segment.context}
Example: "${segment.sample_voice}"

QUESTION: "${question}"
${expertSummary ? `EXPERT SUMMARY:\n${expertSummary}` : ''}

WEB SEARCH (optional): If you have search, use at most one quick lookup for current local prices or news that shapes how this segment reacts; otherwise rely on the segment brief.

Generate ${segment.count} voice reactions (1-2 sentences each).
Vary opinions WITHIN the segment. Feel like REAL people.
A Gangnam office worker ≠ Hongdae art student ≠ Itaewon expat.

Return JSON: [{"voice":"text","sentiment":"positive"|"negative"|"neutral"}]`;
}
