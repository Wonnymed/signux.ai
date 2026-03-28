-- Unique triplet endpoints per user for upsert from cognify (lib/memory/knowledge-graph.ts)
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_triplets_user_src_tgt_rel_uidx
  ON knowledge_triplets (user_id, source_name, target_name, relation_type);
