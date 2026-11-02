import { practiceRequest } from "@/lib/practice/server";
export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return practiceRequest(request, "get", (await context.params).sessionId);
}
