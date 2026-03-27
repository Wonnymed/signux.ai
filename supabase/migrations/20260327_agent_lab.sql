-- Agent Lab: user-owned Joker profile + specialist overrides
CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joker_name TEXT DEFAULT 'The Joker',
  joker_role TEXT DEFAULT '',
  joker_bio TEXT DEFAULT '',
  joker_risk_tolerance TEXT DEFAULT 'moderate',
  joker_priorities TEXT[] DEFAULT '{}',
  joker_biases TEXT DEFAULT '',
  joker_enabled BOOLEAN DEFAULT FALSE,
  agent_overrides JSONB DEFAULT '{}',
  disabled_agents TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_agent UNIQUE (user_id)
);

ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own agents" ON user_agents;
DROP POLICY IF EXISTS "Users update own agents" ON user_agents;
DROP POLICY IF EXISTS "Users insert own agents" ON user_agents;

CREATE POLICY "Users read own agents"
  ON user_agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own agents"
  ON user_agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own agents"
  ON user_agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_user_agents_row()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_agents (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_agents'
  ) THEN
    CREATE TRIGGER on_auth_user_created_agents
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION create_user_agents_row();
  END IF;
END;
$$;
