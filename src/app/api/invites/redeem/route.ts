import { matchRequest } from "@/lib/matches/server";
export async function POST(request: Request) { return matchRequest(request, "join"); }
