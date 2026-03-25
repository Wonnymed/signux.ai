/**
 * Knowledge RAG Search — semantic similarity search over curated .md knowledge base.
 *
 * Each agent gets relevant knowledge chunks injected into their context
 * BEFORE they respond. This transforms agents from "LLM pretending to be expert"
 * to "LLM with expert-level curated knowledge base."
 *
 * Search methods:
 *   1. Vector similarity (semantic meaning match)
 *   2. Category filter (agent searches their domain)
 *   3. Tag match (specific topic relevance)
 *   4. Hybrid (vector + category + tags combined)
 */

import { supabase } from '../memory/supabase';

export type KnowledgeChunk = {
  id: string;
  source_file: string;
  title: string;
  category: string;
  content: string;
  section_header: string | null;
  confidence: string;
  tags: string[];
  v_series: string | null;
  similarity?: number;
};

// ═══ EMBEDDING GENERATION (for query) ═══

async function embedQuery(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

// ═══ VECTOR SIMILARITY SEARCH ═══

/**
 * Search knowledge base by semantic similarity.
 *
 * @param query — natural language query
 * @param options.categories — filter to specific knowledge categories
 * @param options.vSeries — filter to specific V-series
 * @param options.tags — filter by tags
 * @param options.limit — max results
 * @param options.minSimilarity — minimum cosine similarity threshold (0-1)
 */
export async function searchKnowledge(
  query: string,
  options: {
    categories?: string[];
    vSeries?: string[];
    tags?: string[];
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<KnowledgeChunk[]> {
  if (!supabase) return [];

  const { categories, vSeries, tags, limit = 5, minSimilarity = 0.3 } = options;

  // Generate query embedding
  const queryEmbedding = await embedQuery(query);

  // Build the RPC call for vector similarity search
  const { data, error } = await supabase.rpc('search_knowledge', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: minSimilarity,
    match_count: limit * 2, // fetch extra, filter after
    filter_categories: categories || null,
    filter_v_series: vSeries || null,
  });

  if (error) {
    console.error('Knowledge search error:', error);
    return [];
  }

  let results: KnowledgeChunk[] = (data || []).map((row: any) => ({
    id: row.id,
    source_file: row.source_file,
    title: row.title,
    category: row.category,
    content: row.content,
    section_header: row.section_header,
    confidence: row.confidence,
    tags: row.tags || [],
    v_series: row.v_series,
    similarity: row.similarity,
  }));

  // Additional tag filtering (if specified)
  if (tags && tags.length > 0) {
    results = results.filter(r =>
      r.tags.some(t => tags.some(ft => t.toLowerCase().includes(ft.toLowerCase())))
    );
  }

  // Deduplicate by source file (keep highest similarity per file)
  const seen = new Map<string, KnowledgeChunk>();
  for (const r of results) {
    const existing = seen.get(r.source_file);
    if (!existing || (r.similarity || 0) > (existing.similarity || 0)) {
      seen.set(r.source_file, r);
    }
  }

  return [...seen.values()]
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, limit);
}

// ═══ FORMAT FOR AGENT CONTEXT ═══

/**
 * Format knowledge chunks for injection into agent context.
 * Concise but information-rich — agents see the knowledge, not the metadata.
 */
export function formatKnowledgeForAgent(
  chunks: KnowledgeChunk[],
  agentName: string
): string {
  if (chunks.length === 0) return '';

  const formatted = chunks.map((c, i) => {
    const confidence = c.confidence === 'high' ? '■■■' : c.confidence === 'medium' ? '■■□' : '■□□';
    const source = c.source_file.replace('.md', '').replace(/\//g, ' > ');
    return `[${i + 1}] ${c.title} (${confidence})\n${c.content}\nSource: ${source}`;
  }).join('\n\n');

  return `
══ KNOWLEDGE BASE (curated intelligence for ${agentName}) ══
The following is verified, curated knowledge relevant to this analysis.
Use these facts and frameworks to ground your response. Cite [N] when referencing.

${formatted}

══════════════════════════════════════════════════════════════
`;
}
