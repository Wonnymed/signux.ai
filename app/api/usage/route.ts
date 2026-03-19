import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getUserTier, getUsage } from "../../lib/usage";
import { TIER_LIMITS } from "../../lib/plans";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ tier: "free", usage: { chat_today: 0, simulations_month: 0, researches_month: 0 }, limits: TIER_LIMITS.free });
  }

  const tier = await getUserTier(userId);
  const usage = await getUsage(userId);
  const limits = TIER_LIMITS[tier];

  return NextResponse.json({ tier, usage, limits });
}
