import { matchRequest, matchError } from "@/lib/matches/server";
type Context = { params: Promise<{ matchId: string; action: string }> };
export async function GET(request: Request, context: Context) {
  const { matchId, action } = await context.params;
  return ["state", "results"].includes(action) ? matchRequest(request, "get", matchId) : matchError("ROOM_UNAVAILABLE");
}
export async function POST(request: Request, context: Context) {
  const { matchId, action } = await context.params;
  const commands = { ready: "ready", heartbeat: "heartbeat", sync: "sync", answers: "answer", leave: "leave", invite: "invite" } as const;
  return Object.hasOwn(commands, action) ? matchRequest(request, commands[action as keyof typeof commands], matchId) : matchError("ROOM_UNAVAILABLE");
}
