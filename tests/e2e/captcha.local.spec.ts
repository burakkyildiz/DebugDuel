import { expect, test } from "@playwright/test";

test.skip(process.env.LOCAL_CAPTCHA_E2E !== "1", "Run the isolated local CAPTCHA test.");
test("requires a fresh challenge for signup and each resend", async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "application/javascript", body: `
    let n = 0;
    window.turnstile = { ready: cb => cb(), render: (el, opts) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Complete test verification'; button.onclick = () => opts.callback('token-' + (++n)); el.appendChild(button); return String(n); }, remove: () => {} };
  ` }));
  const tokens: string[] = [];
  await page.route("**/api/auth/signup", async route => { tokens.push(route.request().postDataJSON().captchaToken); await route.fulfill({ json: { confirmation: true } }); });
  await page.route("**/api/auth/resend", async route => { tokens.push(route.request().postDataJSON().captchaToken); await route.fulfill({ json: { confirmation: true } }); });
  await page.goto("/signup");
  await page.getByLabel("Email address").fill("captcha@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
  await page.getByRole("button", { name: "Complete test verification" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Resend confirmation email" })).toBeDisabled();
  await page.getByRole("button", { name: "Complete test verification" }).click();
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect.poll(() => tokens.length).toBe(2);
  expect(tokens[0]).not.toBe(tokens[1]);
});
