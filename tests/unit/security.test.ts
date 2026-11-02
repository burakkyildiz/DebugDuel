import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/security/redirect";
import { loginSchema, profileSchema, signupSchema } from "@/lib/validation/auth";

describe("redirect boundaries", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/profile\r\nLocation: https://evil.test", "/invite/secret-token", "/profile?next=https://evil.test", null, ["/profile"]])("rejects external or noncanonical target %s", value => expect(safeRedirect(value, "/")).toBe("/"));
  it.each(["/invite", "/play", "/profile", "/match/123e4567-e89b-42d3-a456-426614174000/results"])("keeps a safe internal path %s", value => expect(safeRedirect(value)).toBe(value));
});
describe("strict input contracts", () => {
  it("rejects injected identity and score fields", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "password", userId: "other" }).success).toBe(false);
    expect(profileSchema.safeParse({ username: "hello", displayName: "Hello", avatarSeed: "violet", xp: 100 }).success).toBe(false);
  });
  it("enforces minimum signup password and ASCII username", () => {
    expect(signupSchema.safeParse({ email: "a@example.com", password: "short" }).success).toBe(false);
    expect(profileSchema.safeParse({ username: "hëllo", displayName: "Hello", avatarSeed: "violet" }).success).toBe(false);
    expect(profileSchema.safeParse({ username: "hello_123", displayName: "Hello", avatarSeed: "mint" }).success).toBe(true);
  });
});
