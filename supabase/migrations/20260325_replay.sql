-- PROMPT-25: Decision Replay — replay_of column for time-travel benchmarking
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS replay_of TEXT;
