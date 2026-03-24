-- Phase 2B: Memory System — Supabase Tables
-- Run in Supabase Dashboard SQL Editor or via supabase db push

-- Enable pgvector extension (for embeddings later)
CREATE EXTENSION IF NOT EXISTS vector;

-- SIMULATIONS (save every completed simulation)
CREATE TABLE IF NOT EXISTS simulations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  engine TEXT NOT NULL DEFAULT 'simulate',
  question TEXT NOT NULL,
  plan JSONB,
  debate JSONB,
  verdict JSONB,
  evaluation JSONB,
  citations JSONB,
  follow_ups TEXT[],
  counter_factual JSONB,
  blind_spots JSONB,
  audit JSONB,
  status TEXT DEFAULT 'running',
  total_tokens INT DEFAULT 0,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER FACTS (Mem0 pattern — persistent memory per user)
CREATE TABLE IF NOT EXISTS user_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  confidence FLOAT DEFAULT 0.8,
  evidence_count INT DEFAULT 1,
  source_simulation TEXT REFERENCES simulations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DECISION PROFILES (auto-generated user summaries)
CREATE TABLE IF NOT EXISTS decision_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  profile_text TEXT,
  key_facts JSONB,
  simulation_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (users only see their own data)
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own simulations" ON simulations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own facts" ON user_facts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own profile" ON decision_profiles FOR ALL USING (auth.uid() = user_id);

-- Allow anonymous inserts for free tier (no auth yet)
CREATE POLICY "Allow anonymous simulation inserts" ON simulations FOR INSERT WITH CHECK (true);
