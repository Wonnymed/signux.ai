-- Persist last billed simulation mode for sidebar badges (SIM / A/B / STRESS / PRE-M).
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_sim_mode TEXT;
