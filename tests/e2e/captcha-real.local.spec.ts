import { expect, test } from "@playwright/test";
test.skip(process.env.LOCAL_CAPTCHA_E2E !== "1", "Isolated CAPTCHA test only.");
test("loads the real Turnstile widget with Cloudflare's test key under the application CSP", async ({ page }) => {
  let token = "";
  await page.route("**/api/auth/signup", async route => {
    token = route.request().postDataJSON().captchaToken;
    await route.fulfill({ json: { confirmation: true } });
  });
  await page.goto("/signup");
  await page.getByLabel("Email address").fill("captcha@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  const submit = page.getByRole("button", { name: "Create account" });
  await expect(submit).toBeEnabled({ timeout: 30000 });
  await submit.click();
  await expect.poll(() => token).toBe("XXXX.DUMMY.TOKEN.XXXX");
});
