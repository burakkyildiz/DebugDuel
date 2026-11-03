import { matchRequest } from "@/lib/matches/server";
export async function POST(request: Request) { return matchRequest(request, "create"); }
export async function GET(request: Request) { return matchRequest(request, "active"); }
