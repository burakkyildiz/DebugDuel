type ProviderError = { status?: number; code?: string } | null;

export function authDependencyFailure(error: ProviderError): "rate_limited" | "unavailable" | null {
  if (!error) return null;
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rate_limited";
  if (!error.status || error.status >= 500) return "unavailable";
  return null;
}

// Preserve account privacy while distinguishing delivery failures from success.
export function emailRequestResult(error: ProviderError): "accepted" | "rate_limited" | "invalid" | "unavailable" {
  if (!error || ["user_already_exists", "email_exists", "user_not_found"].includes(error.code ?? "")) return "accepted";
  if (error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code ?? "")) return "rate_limited";
  if (["weak_password", "email_address_invalid", "validation_failed"].includes(error.code ?? "")) return "invalid";
  return "unavailable";
}
