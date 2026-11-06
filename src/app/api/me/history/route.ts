import { currentUser } from "@/lib/auth";
import { copy } from "@/content/copy.en";
import { InvalidCursor, parsePageLimit, readHistory } from "@/lib/progression/server";
import { failure, json } from "@/lib/security/http";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user?.email_confirmed_at) return failure("AUTH_REQUIRED", 401, copy.match.errors.AUTH_REQUIRED);
  const params = new URL(request.url).searchParams;
  const limit = parsePageLimit(params.get("limit"));
  if (!limit.success) return failure();
  try {
    const client = await createClient();
    if (!client) return failure("HISTORY_UNAVAILABLE", 503, copy.history.error);
    return json(await readHistory(client, params.get("cursor"), limit.data));
  } catch (error) {
    return error instanceof InvalidCursor ? failure() : failure("HISTORY_UNAVAILABLE", 503, copy.history.error);
  }
}
