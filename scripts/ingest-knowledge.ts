/**
 * KNOWLEDGE BASE INGEST PIPELINE
 *
 * Reads all .md files from the knowledge base directory,
 * chunks them, generates embeddings, stores in Supabase.
 *
 * Input: directory of .md files (V-series + topic folders)
 * Output: knowledge_chunks table populated with embedded chunks
 *
 * Run: npx tsx scripts/ingest-knowledge.ts /path/to/knowledge-base
 *
 * Cost: ~$0.10-0.15 for ~3,500 files (text-embedding-3-small)
 * Time: ~15-30 minutes (rate limited)
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ═══ CONFIGURATION ═══
const CHUNK_SIZE = 400;        // target tokens per chunk
const CHUNK_OVERLAP = 50;      // overlap between chunks
const BATCH_SIZE = 20;         // embeddings per API call
const DELAY_MS = 500;          // ms between batches

// ═══ TYPES ═══
type Frontmatter = {
  title?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  confidence?: string;
  source?: string;
};

type Chunk = {
  source_file: string;
  title: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  confidence: string;
  chunk_index: number;
  content: string;
  section_header: string | null;
  token_count: number;
  related_files: string[];
  v_series: string | null;
};

// ═══ FRONTMATTER PARSER ═══
function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fmText = match[1];
  const body = match[2];
  const frontmatter: Frontmatter = {};

  for (const line of fmText.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    const cleaned = value.replace(/^["']|["']$/g, '').trim();

    if (key === 'tags') {
      try {
        frontmatter.tags = JSON.parse(cleaned);
      } catch {
        frontmatter.tags = cleaned.split(',').map(t => t.trim().replace(/["'\[\]]/g, ''));
      }
    } else {
      (frontmatter as any)[key] = cleaned;
    }
  }

  return { frontmatter, body };
}

// ═══ CHUNKER ═══
function chunkDocument(body: string, maxTokens: number = CHUNK_SIZE): { content: string; section: string | null }[] {
  const chunks: { content: string; section: string | null }[] = [];
  let currentSection: string | null = null;
  let currentChunk = '';
  let currentTokens = 0;

  const lines = body.split('\n');

  for (const line of lines) {
    // Detect section headers
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch) {
      currentSection = headerMatch[1].trim();
    }

    const lineTokens = Math.ceil(line.length / 4); // rough token estimate

    if (currentTokens + lineTokens > maxTokens && currentChunk.trim()) {
      chunks.push({ content: currentChunk.trim(), section: currentSection });
      // Keep overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-CHUNK_OVERLAP);
      currentChunk = overlapWords.join(' ') + '\n' + line;
      currentTokens = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += '\n' + line;
      currentTokens += lineTokens;
    }
  }

  // Last chunk
  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), section: currentSection });
  }

  return chunks;
}

// ═══ EMBEDDING GENERATOR ═══
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });

  const data = await response.json();

  if (!data.data) {
    console.error('Embedding API error:', data);
    throw new Error('Embedding generation failed');
  }

  return data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((d: any) => d.embedding);
}

// ═══ V-SERIES DETECTOR ═══
function detectVSeries(filePath: string): string | null {
  const match = filePath.match(/[Vv](\d{1,3})[\/\-_]/);
  if (match) return `V${match[1].padStart(2, '0')}`;

  const parts = filePath.split('/');
  for (const part of parts) {
    const dirMatch = part.match(/^[Vv](\d{1,3})$/);
    if (dirMatch) return `V${dirMatch[1].padStart(2, '0')}`;
  }

  return null;
}

// ═══ RELATED FILES EXTRACTOR ═══
function extractRelatedFiles(body: string): string[] {
  const links: string[] = [];
  const matches = body.matchAll(/\[\[([^\]]+)\]\]/g);
  for (const match of matches) {
    links.push(match[1]);
  }
  return links;
}

// ═══ SINGLE FILE PROCESSOR ═══
async function processFile(filePath: string, basePath: string): Promise<Chunk[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  const relativePath = path.relative(basePath, filePath);
  const vSeries = detectVSeries(relativePath);
  const relatedFiles = extractRelatedFiles(body);

  const category = frontmatter.category
    || path.dirname(relativePath).split('/')[0]
    || 'general';

  const textChunks = chunkDocument(body);

  return textChunks.map((chunk, i) => ({
    source_file: relativePath,
    title: frontmatter.title || path.basename(filePath, '.md'),
    category,
    subcategory: frontmatter.subcategory || null,
    tags: frontmatter.tags || [],
    confidence: frontmatter.confidence || 'medium',
    chunk_index: i,
    content: chunk.content,
    section_header: chunk.section,
    token_count: Math.ceil(chunk.content.length / 4),
    related_files: relatedFiles,
    v_series: vSeries,
  }));
}

// ═══ DIRECTORY WALKER ═══
function walkDir(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// ═══ MAIN PIPELINE ═══
async function main() {
  const basePath = process.argv[2];
  if (!basePath) {
    console.error('Usage: npx tsx scripts/ingest-knowledge.ts /path/to/knowledge-base');
    process.exit(1);
  }

  console.log('Octux Knowledge Base Ingest Pipeline');
  console.log(`Source: ${basePath}`);
  console.log('');

  // 1. Find all .md files
  const files = walkDir(basePath);
  console.log(`Found ${files.length} .md files`);

  // 2. Process all files into chunks
  const allChunks: Chunk[] = [];
  let processedFiles = 0;

  for (const file of files) {
    try {
      const chunks = await processFile(file, basePath);
      allChunks.push(...chunks);
      processedFiles++;
      if (processedFiles % 100 === 0) {
        console.log(`  Processed ${processedFiles}/${files.length} files (${allChunks.length} chunks)`);
      }
    } catch (err) {
      console.error(`  Error processing ${file}:`, err);
    }
  }

  console.log(`\n${processedFiles} files -> ${allChunks.length} chunks`);

  // 3. Generate embeddings in batches
  console.log('\nGenerating embeddings...');
  let embeddedCount = 0;

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => `${c.title}\n${c.section_header || ''}\n${c.content}`.trim());

    try {
      const embeddings = await generateEmbeddings(texts);

      const rows = batch.map((chunk, j) => ({
        source_file: chunk.source_file,
        title: chunk.title,
        category: chunk.category,
        subcategory: chunk.subcategory,
        tags: chunk.tags,
        confidence: chunk.confidence,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        section_header: chunk.section_header,
        embedding: JSON.stringify(embeddings[j]),
        token_count: chunk.token_count,
        related_files: chunk.related_files,
        v_series: chunk.v_series,
      }));

      const { error } = await supabase.from('knowledge_chunks').insert(rows);
      if (error) {
        console.error(`  DB insert error at batch ${i}:`, error.message);
      } else {
        embeddedCount += batch.length;
      }

      if (embeddedCount % 200 === 0) {
        console.log(`  Embedded ${embeddedCount}/${allChunks.length} chunks`);
      }
    } catch (err) {
      console.error(`  Embedding error at batch ${i}:`, err);
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  console.log(`\n${embeddedCount} chunks embedded and stored`);

  // 4. Print summary
  const categories = new Set(allChunks.map(c => c.category));
  const vSeries = new Set(allChunks.filter(c => c.v_series).map(c => c.v_series));

  console.log('\n=== SUMMARY ===');
  console.log(`Files:      ${processedFiles}`);
  console.log(`Chunks:     ${allChunks.length}`);
  console.log(`Embedded:   ${embeddedCount}`);
  console.log(`Categories: ${categories.size} (${[...categories].slice(0, 10).join(', ')}...)`);
  console.log(`V-Series:   ${vSeries.size} (${[...vSeries].slice(0, 10).join(', ')}...)`);
  console.log(`\nEstimated embedding cost: $${(allChunks.length * 0.00004).toFixed(2)}`);
}

main().catch(console.error);
