-- PROMPT-27: What-If Forking — branch simulations with modified parameters
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS forked_from TEXT;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS fork_modifications JSONB;
