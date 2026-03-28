/**
 * Knowledge Graph — Cognee cognify equivalent for Octux.
 * Extracts entities + relationships from simulations and stores as navigable graph.
 *
 * Refs: Cognee (#22 — ECL pipeline, ontology grounding)
 *       MiroFish (#10 — seed-to-world entity extraction)
 *       Graphiti (#27 — episodic provenance, non-lossy updates)
 */

import { callClaude, parseJSON } from '../simulation/claude';
import { supabase } from './supabase';

// ═══════════════════════════════════════════
// ONTOLOGY — Controlled entity and relation types
// Cognee pattern: grounded types make the graph QUERYABLE
// ═══════════════════════════════════════════

export const OCTUX_ENTITY_TYPES = [
  'person',       // founders, team members, advisors, competitors' leaders
  'company',      // startups, competitors, partners, suppliers
  'market',       // target markets, segments, niches
  'location',     // cities, districts, countries, specific addresses
  'regulation',   // permits, licenses, legal requirements
  'product',      // products, services, features, MVPs
  'metric',       // revenue, costs, growth rates, market size
  'risk',         // identified risks, threats, blockers
  'opportunity',  // upside scenarios, untapped potential
  'decision',     // past decisions and their outcomes
  'milestone',    // deadlines, launch dates, funding rounds
  'resource',     // budget, team, equipment, technology
] as const;

export type OctuxEntityType = typeof OCTUX_ENTITY_TYPES[number];

export const OCTUX_RELATION_TYPES = [
  'targets_market',    // company → market
  'competes_with',     // company → company
  'requires',          // action → regulation/resource
  'located_in',        // company/person → location
  'depends_on',        // decision → resource/milestone
  'costs',             // product/action → metric
  'blocks',            // risk/regulation → decision/milestone
  'enables',           // resource/decision → opportunity
  'decided',           // person → decision
  'risks',             // decision → risk
  'employs',           // company → person
  'supplies',          // company → company/product
  'has_budget',        // company/person → metric
  'launches_at',       // product → milestone/location
  'regulated_by',      // market/product → regulation
] as const;

export type OctuxRelationType = typeof OCTUX_RELATION_TYPES[number];

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type ExtractedEntity = {
  name: string;
  entity_type: OctuxEntityType;
  description: string;
  properties?: Record<string, string | number>;
};

export type ExtractedRelation = {
  source: string;      // entity name (must match an extracted entity)
  target: string;      // entity name (must match an extracted entity)
  relation_type: OctuxRelationType;
  description: string; // human-readable: "Gangnam requires food permit from Korean FDA"
  confidence: number;  // 0-1
};

export type CognifyResult = {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
  entity_count: number;
  relation_count: number;
};

// ═══════════════════════════════════════════
// COGNIFY — Extract entities + relations from simulation
// ═══════════════════════════════════════════

export async function cognify(
  userId: string,
  simulationId: string,
  question: string,
  verdictSummary: string,
  agentReportsSummary: string
): Promise<CognifyResult> {
  if (!supabase) return { entities: [], relations: [], entity_count: 0, relation_count: 0 };

  const entityTypes = OCTUX_ENTITY_TYPES.join(', ');
  const relationTypes = OCTUX_RELATION_TYPES.join(', ');

  const response = await callClaude({
    systemPrompt: `You are a knowledge graph extractor for Octux AI. Given a business decision simulation, extract ENTITIES (people, companies, markets, locations, regulations, metrics, risks, etc.) and RELATIONSHIPS between them.

ONTOLOGY — use ONLY these types:

ENTITY TYPES: ${entityTypes}

RELATION TYPES: ${relationTypes}

RULES:
1. Extract SPECIFIC entities mentioned in the simulation — not generic concepts.
   GOOD: "Gangnam Station" (location), "Korean FDA" (regulation), "$50K" (metric)
   BAD: "the market" (too vague), "success" (not an entity), "analysis" (not an entity)

2. Each relation must connect two extracted entities. The source and target names must EXACTLY match entity names in your entities array.

3. Entity names should be NORMALIZED — "Korean Food and Drug Administration" and "Korean FDA" = use "Korean FDA".

4. Include QUANTITATIVE entities: "$50K budget" (metric), "3-month timeline" (milestone), "35% failure rate" (metric).

5. Extract 8-20 entities and 5-15 relations per simulation. Quality over quantity.

6. Descriptions should be one sentence explaining the entity/relation in context of this specific decision.

7. Return ONLY valid JSON, nothing else.`,
    userMessage: `SIMULATION DATA:

QUESTION: "${question}"

VERDICT SUMMARY: ${verdictSummary}

AGENT INSIGHTS: ${agentReportsSummary}

Extract entities and relationships. Return JSON:
{
  "entities": [
    {
      "name": "Entity Name",
      "entity_type": "one of the ontology types",
      "description": "One sentence about this entity in context",
      "properties": { "optional_key": "optional_value" }
    }
  ],
  "relations": [
    {
      "source": "Source Entity Name",
      "target": "Target Entity Name",
      "relation_type": "one of the ontology types",
      "description": "Human-readable relationship description",
      "confidence": 0.85
    }
  ]
}`,
    maxTokens: 2048,
  });

  try {
    const extracted = parseJSON<{ entities: ExtractedEntity[]; relations: ExtractedRelation[] }>(response);

    // Validate entity types
    const validEntities = extracted.entities.filter(e =>
      OCTUX_ENTITY_TYPES.includes(e.entity_type as OctuxEntityType)
    );

    // Validate relation types and that source/target exist
    const entityNames = new Set(validEntities.map(e => e.name));
    const validRelations = extracted.relations.filter(r =>
      OCTUX_RELATION_TYPES.includes(r.relation_type as OctuxRelationType) &&
      entityNames.has(r.source) &&
      entityNames.has(r.target)
    );

    // Store in Supabase
    const storedEntities = await upsertEntities(userId, simulationId, validEntities);
    const storedRelations = await upsertRelations(userId, simulationId, validRelations, storedEntities);

    console.log(`[cognify] Extracted ${validEntities.length} entities, ${validRelations.length} relations from sim ${simulationId}`);

    return {
      entities: validEntities,
      relations: validRelations,
      entity_count: validEntities.length,
      relation_count: validRelations.length,
    };
  } catch (err) {
    console.error('[cognify] Failed:', err, 'Raw:', response.substring(0, 500));
    return { entities: [], relations: [], entity_count: 0, relation_count: 0 };
  }
}

// ═══════════════════════════════════════════
// STORAGE — Upsert entities and relations
// ═══════════════════════════════════════════

async function upsertEntities(
  userId: string,
  simulationId: string,
  entities: ExtractedEntity[]
): Promise<Map<string, string>> {
  if (!supabase) return new Map();
  const entityMap = new Map<string, string>();

  for (const entity of entities) {
    const { data: existing } = await supabase
      .from('knowledge_entities')
      .select('id, mention_count')
      .eq('user_id', userId)
      .eq('name', entity.name)
      .eq('entity_type', entity.entity_type)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('knowledge_entities')
        .update({
          mention_count: existing.mention_count + 1,
          last_seen_sim: simulationId,
          description: entity.description,
          properties: entity.properties || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      entityMap.set(entity.name, existing.id);
    } else {
      const { data: inserted, error } = await supabase
        .from('knowledge_entities')
        .insert({
          user_id: userId,
          name: entity.name,
          entity_type: entity.entity_type,
          description: entity.description,
          properties: entity.properties || {},
          mention_count: 1,
          first_seen_sim: simulationId,
          last_seen_sim: simulationId,
        })
        .select('id')
        .single();

      if (inserted) {
        entityMap.set(entity.name, inserted.id);
      } else if (error) {
        // Handle race condition on unique constraint
        const { data: retry } = await supabase
          .from('knowledge_entities')
          .select('id')
          .eq('user_id', userId)
          .eq('name', entity.name)
          .eq('entity_type', entity.entity_type)
          .maybeSingle();
        if (retry) entityMap.set(entity.name, retry.id);
      }
    }
  }

  return entityMap;
}

async function upsertRelations(
  userId: string,
  simulationId: string,
  relations: ExtractedRelation[],
  entityMap: Map<string, string>
): Promise<number> {
  if (!supabase) return 0;
  let stored = 0;

  for (const rel of relations) {
    const sourceId = entityMap.get(rel.source);
    const targetId = entityMap.get(rel.target);

    if (!sourceId || !targetId) {
      console.warn(`[cognify] Skipping relation "${rel.source} → ${rel.target}" — entity not found`);
      continue;
    }

    const { data: existing } = await supabase
      .from('knowledge_relations')
      .select('id, weight')
      .eq('user_id', userId)
      .eq('source_entity_id', sourceId)
      .eq('target_entity_id', targetId)
      .eq('relation_type', rel.relation_type)
      .maybeSingle();

    if (existing) {
      // Strengthen existing relation (Cognee memify pattern)
      await supabase
        .from('knowledge_relations')
        .update({
          weight: Math.min(existing.weight + 0.2, 5.0),
          confidence: Math.max(existing.weight > 1 ? 0.95 : rel.confidence, rel.confidence),
          description: rel.description,
          source_simulation_id: simulationId,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      stored++;
    } else {
      const { error } = await supabase
        .from('knowledge_relations')
        .insert({
          user_id: userId,
          source_entity_id: sourceId,
          target_entity_id: targetId,
          relation_type: rel.relation_type,
          description: rel.description,
          weight: 1.0,
          confidence: rel.confidence,
          source_simulation_id: simulationId,
          is_active: true,
        });

      if (error && !error.message.includes('duplicate')) {
        console.warn(`[cognify] Failed to insert relation:`, error.message);
      } else {
        stored++;
      }
    }
  }

  return stored;
}

// ═══════════════════════════════════════════
// GRAPH QUERIES — Retrieve knowledge for context
// ═══════════════════════════════════════════

export async function getEntities(
  userId: string,
  entityType?: OctuxEntityType,
  limit: number = 50
): Promise<Record<string, unknown>[]> {
  if (!supabase) return [];

  let query = supabase
    .from('knowledge_entities')
    .select('*')
    .eq('user_id', userId)
    .order('mention_count', { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data, error } = await query;
  if (error) { console.error('[cognify] getEntities error:', error); return []; }
  return data || [];
}

export async function getTriplets(
  userId: string,
  limit: number = 50
): Promise<Record<string, unknown>[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('knowledge_triplets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('weight', { ascending: false })
    .limit(limit);

  if (error) { console.error('[cognify] getTriplets error:', error); return []; }
  return data || [];
}

export async function getConnected(
  userId: string,
  entityName: string
): Promise<{ entity: Record<string, unknown> | null; outgoing: Record<string, unknown>[]; incoming: Record<string, unknown>[] }> {
  if (!supabase) return { entity: null, outgoing: [], incoming: [] };

  const { data: entity } = await supabase
    .from('knowledge_entities')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', entityName)
    .maybeSingle();

  if (!entity) return { entity: null, outgoing: [], incoming: [] };

  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from('knowledge_triplets')
      .select('*')
      .eq('user_id', userId)
      .eq('source_name', entity.name)
      .eq('is_active', true)
      .order('weight', { ascending: false }),
    supabase
      .from('knowledge_triplets')
      .select('*')
      .eq('user_id', userId)
      .eq('target_name', entity.name)
      .eq('is_active', true)
      .order('weight', { ascending: false }),
  ]);

  return {
    entity,
    outgoing: outgoing || [],
    incoming: incoming || [],
  };
}

export async function queryByTypeAndRelation(
  userId: string,
  entityType: OctuxEntityType,
  relationType: OctuxRelationType
): Promise<Record<string, unknown>[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('knowledge_triplets')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', entityType)
    .eq('relation_type', relationType)
    .eq('is_active', true)
    .order('weight', { ascending: false });

  if (error) { console.error('[cognify] queryByTypeAndRelation error:', error); return []; }
  return data || [];
}

export async function formatGraphForContext(
  userId: string,
  maxEntities: number = 15,
  maxRelations: number = 10
): Promise<string> {
  const [entities, triplets] = await Promise.all([
    getEntities(userId, undefined, maxEntities),
    getTriplets(userId, maxRelations),
  ]);

  if (entities.length === 0 && triplets.length === 0) return '';

  let context = '\n═══ KNOWLEDGE GRAPH ═══\n';

  if (entities.length > 0) {
    context += 'KEY ENTITIES:\n';
    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const e of entities) {
      const type = e.entity_type as string;
      const list = grouped.get(type) || [];
      list.push(e);
      grouped.set(type, list);
    }
    for (const [type, ents] of grouped) {
      context += `  ${type.toUpperCase()}: ${ents.map(e => e.name).join(', ')}\n`;
    }
  }

  if (triplets.length > 0) {
    context += 'KEY RELATIONSHIPS:\n';
    for (const t of triplets) {
      context += `  ${t.source_name} —[${t.relation_type}]→ ${t.target_name}`;
      if ((t.weight as number) > 1.5) context += ' (strong)';
      context += '\n';
    }
  }

  context += '═══════════════════════\n';
  context += 'Use these known entities and relationships to ground your analysis in established facts.\n';

  return context;
}
