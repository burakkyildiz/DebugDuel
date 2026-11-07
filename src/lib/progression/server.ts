import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { seal, unseal } from "@/lib/security/sealed";
import { headers } from "next/headers";
import { admitPublicRead } from "@/lib/security/public-read";

const position = z.object({ time: z.iso.datetime({ offset: true }), id: z.uuid() }).strict();
const leaderboardPosition = position.extend({
  xp: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  rank: z.number().int().nonnegative(),
});

const pageSize = 25;
const limitSchema = z.string().regex(/^[1-9]\d?$/).transform(Number).pipe(z.number().max(50));
export const parsePageLimit = (value: string | null) => limitSchema.safeParse(value ?? String(pageSize));

export class InvalidCursor extends Error {}

function readCursor<T>(token: unknown, purpose: string, schema: z.ZodType<T>): T | undefined {
  if (token === null || token === undefined) return undefined;
  try {
    if (typeof token !== "string" || token.length > 512) throw new Error();
    return schema.parse(unseal(token, purpose, process.env.GUEST_SESSION_SECRET));
  } catch {
    throw new InvalidCursor();
  }
}

function writeCursor(value: unknown, purpose: string) {
  return seal(value, purpose, process.env.GUEST_SESSION_SECRET);
}

type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export async function readHistory(client: Client, token: unknown, limit = pageSize) {
  const purpose = "debug-duel:history-cursor:v1";
  const cursor = readCursor(token, purpose, position);
  const { data, error } = await client.rpc("match_history", {
    p_before: cursor?.time,
    p_before_id: cursor?.id,
    p_limit: limit + 1,
  });
  if (error) throw error;
  const items = data.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: last && data.length > limit
      ? writeCursor({ time: last.created_at, id: last.match_id }, purpose)
      : null,
  };
}

export async function readLeaderboard(client: Client, token: unknown, limit = pageSize, requestHeaders?: Headers) {
  const purpose = "debug-duel:leaderboard-cursor:v1";
  const cursor = readCursor(token, purpose, leaderboardPosition);
  await admitPublicRead(requestHeaders ?? await headers(), "leaderboard");
  let query = client.from("profiles").select("id,created_at,username,avatar_seed,xp,wins,losses,draws")
    .not("onboarding_completed_at", "is", null).gt("matches_played", 0);
  if (cursor) {
    const { xp, wins, time, id } = cursor;
    // All values are validated and the timestamp is quoted for PostgREST.
    query = query.or([
      "xp.lt." + xp,
      "and(xp.eq." + xp + ",wins.lt." + wins + ")",
      'and(xp.eq.' + xp + ',wins.eq.' + wins + ',created_at.gt."' + time + '")',
      'and(xp.eq.' + xp + ',wins.eq.' + wins + ',created_at.eq."' + time + '",id.gt.' + id + ')',
    ].join(","));
  }
  const { data, error } = await query.order("xp", { ascending: false }).order("wins", { ascending: false })
    .order("created_at").order("id").limit(limit + 1);
  if (error) throw error;
  const rows = data.slice(0, limit);
  const last = rows.at(-1);
  const rank = cursor?.rank ?? 0;
  return {
    items: rows.map(({ username, avatar_seed, xp, wins, losses, draws }, index) => ({
      username, avatar_seed, xp, wins, losses, draws, rank: rank + index + 1,
    })),
    nextCursor: last && data.length > limit
      ? writeCursor({ time: last.created_at, id: last.id, xp: last.xp, wins: last.wins, rank: rank + rows.length }, purpose)
      : null,
  };
}
