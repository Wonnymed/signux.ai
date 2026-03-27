import { NextResponse } from 'next/server';
import { seedAgentsCatalog } from '@/lib/agents/seed-catalog';
import { seedAgentLibrary } from '@/lib/agents/seed';

/**
 * POST /api/agents/seed
 * 1) Upserts `agents` from AGENT_CATALOG (60 rows) — for backend / verdicts / joins
 * 2) Seeds `agent_categories` + `agent_library` (full prompts) when Supabase is configured
 */
export async function POST() {
  try {
    const { seeded } = await seedAgentsCatalog();

    try {
      const library = await seedAgentLibrary();
      return NextResponse.json({
        seeded,
        library: { agents: library.agents, categories: library.categories },
      });
    } catch (libErr) {
      console.error('seedAgentLibrary:', libErr);
      return NextResponse.json({
        seeded,
        library: {
          error: libErr instanceof Error ? libErr.message : 'agent_library seed failed',
        },
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    );
  }
}
