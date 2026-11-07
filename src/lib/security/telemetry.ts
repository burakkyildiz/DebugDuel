import "server-only";

type Operation = `match.${"create" | "join" | "invite" | "ready" | "heartbeat" | "sync" | "get" | "answer" | "leave" | "active"}`
  | `practice.${"create" | "get" | "answer" | "reveal"}` | "health" | "leaderboard";

export async function observed(operation: Operation, work: () => Promise<Response>) {
  const started = performance.now();
  const response = await work();
  const requestId = response.headers.get("X-Request-ID") ?? crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);
  let code: string | undefined;
  if (response.status >= 400) {
    try {
      const body = await response.clone().json();
      // No raw errors, URLs, request headers, cookies or input fields reach this log.
      if (typeof body.error?.code === "string" && /^[A-Z_]{1,48}$/.test(body.error.code)) code = body.error.code;
    } catch { /* Non-JSON errors still have a status and a server-generated ID. */ }
  }
  console.info(JSON.stringify({ event: "api_request", requestId, operation, status: response.status, code, durationMs: Math.round(performance.now() - started) }));
  return response;
}
