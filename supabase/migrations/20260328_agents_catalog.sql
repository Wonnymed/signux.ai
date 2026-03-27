-- Canonical agent catalog (60 rows) — synced from lib/agents/catalog.ts via POST /api/agents/seed
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL,
  default_for TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_domain ON agents(domain);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Read-only for clients; writes go through service role (seed) or backend
CREATE POLICY "agents_select_all" ON agents FOR SELECT USING (true);

COMMENT ON TABLE agents IS 'Static catalog mirror of lib/agents/catalog.ts for backend joins and verdict payloads';
