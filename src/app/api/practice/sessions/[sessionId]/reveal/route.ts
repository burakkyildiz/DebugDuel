import { practiceRequest } from "@/lib/practice/server";
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return practiceRequest(request, "reveal", (await context.params).sessionId);
}
