import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/env";
import { copy } from "@/content/copy.en";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function mutationBody(request: Request): Promise<unknown> {
  if (request.headers.get("origin") !== siteOrigin()) throw new Error("INVALID_ORIGIN");
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new Error("INVALID_CONTENT_TYPE");
  if (Number(request.headers.get("content-length") ?? 0) > 4096) throw new Error("BODY_TOO_LARGE");
  // Enforce the limit while streaming, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function failure(code = "INVALID_REQUEST", status = 400, message: string = copy.auth.genericFailure) {
  return json({ error: { code, message }, requestId: crypto.randomUUID() }, status);
}
