import { createClient } from "@/lib/supabase/server";
import { failure, json, mutationBody } from "@/lib/security/http";
import { safeRedirect } from "@/lib/security/redirect";
import { clearRecovery, validRecovery } from "@/lib/security/recovery";
import { siteOrigin } from "@/lib/env";
import { forgotSchema, loginSchema, oauthSchema, resetSchema, signupSchema } from "@/lib/validation/auth";
import { copy } from "@/content/copy.en";
import { z } from "zod";
import { githubProviderEnabled } from "@/lib/supabase/provider-settings";
import { authDependencyFailure, emailRequestResult } from "@/lib/validation/auth-errors";
import { verifyTurnstile } from "@/lib/security/turnstile-server";

function dependencyResponse(error: { status?: number; code?: string } | null) {
  if (error?.code === "captcha_failed") return failure("CAPTCHA_FAILED", 400, copy.auth.captchaFailure);
  const result = authDependencyFailure(error);
  if (result === "rate_limited") {
    const response = failure("RATE_LIMITED", 429, copy.auth.rateLimit);
    response.headers.set("Retry-After", "60");
    return response;
  }
  return result === "unavailable" ? failure("AUTH_UNAVAILABLE", 503, copy.auth.unavailable) : null;
}

function emailResponse(error: { status?: number; code?: string } | null) {
  if (error?.code === "captcha_failed") return failure("CAPTCHA_FAILED", 400, copy.auth.captchaFailure);
  const result = emailRequestResult(error);
  if (result === "rate_limited") {
    // Project-wide email quota has no reset timestamp in the SDK error.
    if (error?.code === "over_email_send_rate_limit") return failure("RATE_LIMITED", 429, copy.auth.emailRateLimit);
    const response = failure("RATE_LIMITED", 429, copy.auth.rateLimit);
    response.headers.set("Retry-After", "60");
    return response;
  }
  if (result === "invalid") return failure();
  if (result === "unavailable") return failure("EMAIL_UNAVAILABLE", 503, copy.auth.emailFailure);
  return json({ confirmation: true });
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["login", "signup", "resend", "forgot", "reset", "github", "logout"].includes(action)) return failure("NOT_FOUND", 404);
  let body: unknown;
  try { body = await mutationBody(request); }
  catch { return failure(); }
  const schemas = { login: loginSchema, signup: signupSchema, resend: forgotSchema.extend({ next: z.string().optional() }), forgot: forgotSchema, reset: resetSchema, github: oauthSchema, logout: z.object({}).strict() };
  if (!schemas[action as keyof typeof schemas].safeParse(body).success) return failure();
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && ["login", "signup", "resend", "forgot"].includes(action)
      && !(body as { captchaToken?: string }).captchaToken?.trim()) return failure("CAPTCHA_REQUIRED", 400, copy.auth.captchaRequired);
  try {
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.AUTH_IP_FORWARDING_ENABLED === "true" && ["login", "signup", "resend", "forgot"].includes(action)) {
      const verified = await verifyTurnstile((body as { captchaToken: string }).captchaToken);
      if (verified === "invalid") return failure("CAPTCHA_FAILED", 400, copy.auth.captchaFailure);
      if (verified !== "valid") return failure("CAPTCHA_UNAVAILABLE", 503, copy.auth.captchaUnavailable);
    }
    const supabase = await createClient();
    if (!supabase) return failure("AUTH_UNAVAILABLE", 503, copy.auth.unavailable);
    if (action === "login") {
      const input = loginSchema.safeParse(body);
      if (!input.success) return failure();
      const { error } = await supabase.auth.signInWithPassword({ email: input.data.email, password: input.data.password, options: { captchaToken: input.data.captchaToken } });
      if (error) {
        return dependencyResponse(error) ?? failure("SIGN_IN_FAILED", 400, copy.auth.loginFailure);
      }
      const profile = await supabase.rpc("ensure_profile");
      if (profile.error) return failure("PROFILE_UNAVAILABLE", 503, copy.profile.unavailable);
      return json({ redirect: safeRedirect(input.data.next) });
    }
    if (action === "signup") {
      const input = signupSchema.safeParse(body);
      if (!input.success) return failure();
      const { email, password } = input.data;
      const { error } = await supabase.auth.signUp({ email, password, options: { captchaToken: input.data.captchaToken, emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(safeRedirect(input.data.next))}` } });
      return emailResponse(error);
    }
    if (action === "resend") {
      const input = schemas.resend.parse(body);
      const { error } = await supabase.auth.resend({ type: "signup", email: input.email, options: { captchaToken: input.captchaToken, emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(safeRedirect(input.next))}` } });
      return emailResponse(error);
    }
    if (action === "forgot") {
      const input = forgotSchema.safeParse(body);
      if (!input.success) return failure();
      const { error } = await supabase.auth.resetPasswordForEmail(input.data.email, { captchaToken: input.data.captchaToken, redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password` });
      return emailResponse(error);
    }
    if (action === "github") {
      const input = oauthSchema.safeParse(body);
      if (!input.success) return failure();
      if (!await githubProviderEnabled()) return failure("PROVIDER_NOT_ENABLED", 503, copy.auth.providerDisabled);
      const next = safeRedirect(input.data.next);
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true } });
      if (error || !data.url) return failure("PROVIDER_UNAVAILABLE", 503, copy.auth.providerFailure);
      return json({ providerUrl: data.url });
    }
    if (action === "reset") {
      const input = resetSchema.safeParse(body);
      if (!input.success) return failure();
      const { data, error: identityError } = await supabase.auth.getUser();
      const identityFailure = dependencyResponse(identityError);
      if (identityFailure) return identityFailure;
      if (identityError || !data.user || !await validRecovery(data.user.id)) return failure("RECOVERY_REQUIRED", 401, copy.auth.callbackFailure);
      const { error } = await supabase.auth.updateUser({ password: input.data.password });
      if (error) return dependencyResponse(error) ?? failure();
      await clearRecovery();
      // The password is already committed; never describe a later failure as
      // a failed password update or pretend session revocation succeeded.
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) return failure("PASSWORD_UPDATED_SIGN_OUT_FAILED", 503, copy.auth.updatedSignOutFailure);
      } catch { return failure("PASSWORD_UPDATED_SIGN_OUT_FAILED", 503, copy.auth.updatedSignOutFailure); }
      return json({ redirect: "/login?updated=1" });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length) return failure();
    const { error } = await supabase.auth.signOut();
    if (error) return dependencyResponse(error) ?? failure();
    await clearRecovery();
    return json({ redirect: "/" });
  } catch {
    return failure("AUTH_UNAVAILABLE", 503, copy.auth.unavailable);
  }
}
