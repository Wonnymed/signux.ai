/**
 * Global test setup — mocks for Supabase and LLM calls.
 * Every test runs without real DB or API connections.
 */

// ═══ MOCK ENVIRONMENT VARIABLES ═══
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.NEXT_PUBLIC_SITE_URL = 'https://octux.ai';
