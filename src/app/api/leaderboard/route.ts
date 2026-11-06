import { copy } from "@/content/copy.en";
import { InvalidCursor, parsePageLimit, readLeaderboard } from "@/lib/progression/server";
import { failure, json } from "@/lib/security/http";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = parsePageLimit(params.get("limit"));
  if (!limit.success) return failure();
  try {
    const client = await createClient();
    if (!client) return failure("LEADERBOARD_UNAVAILABLE", 503, copy.leaderboard.error);
    return json(await readLeaderboard(client, params.get("cursor"), limit.data));
  } catch (error) {
    return error instanceof InvalidCursor ? failure() : failure("LEADERBOARD_UNAVAILABLE", 503, copy.leaderboard.error);
  }
}
