import { copy } from "@/content/copy.en";
import { InvalidCursor, parsePageLimit, readLeaderboard } from "@/lib/progression/server";
import { failure, json } from "@/lib/security/http";
import { createClient } from "@/lib/supabase/server";
import { PublicReadLimited } from "@/lib/security/public-read";
import { observed } from "@/lib/security/telemetry";

export async function GET(request: Request) {
  return observed("leaderboard", () => leaderboard(request));
}
async function leaderboard(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = parsePageLimit(params.get("limit"));
  if (!limit.success) return failure();
  try {
    const client = await createClient();
    if (!client) return failure("LEADERBOARD_UNAVAILABLE", 503, copy.leaderboard.error);
    return json(await readLeaderboard(client, params.get("cursor"), limit.data, request.headers));
  } catch (error) {
    if (error instanceof PublicReadLimited) {
      const response = failure("RATE_LIMITED", 429, copy.auth.rateLimit);
      response.headers.set("Retry-After", "60");
      return response;
    }
    return error instanceof InvalidCursor ? failure() : failure("LEADERBOARD_UNAVAILABLE", 503, copy.leaderboard.error);
  }
}
