-- Public share links: short id on simulations row
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_simulations_share_id ON simulations (share_id) WHERE share_id IS NOT NULL;
