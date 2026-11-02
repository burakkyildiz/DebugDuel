import { practiceRequest } from "@/lib/practice/server";
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return practiceRequest(request, "answer", (await context.params).sessionId);
}
