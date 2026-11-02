import { practiceRequest } from "@/lib/practice/server";
export async function POST(request: Request) { return practiceRequest(request, "create"); }
