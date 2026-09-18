import { expect, test } from "@playwright/test";

test("without DATABASE_URL the agenda offers only the WhatsApp path", async ({ page }) => {
  await page.goto("/agenda");
  await expect(page.getByTestId("agenda-fallback")).toBeVisible();
  const cta = page.getByRole("link", { name: /Consultar horarios por WhatsApp/ });
  await expect(cta).toHaveAttribute("href", /wa\.me/);
  await expect(page.getByTestId("slot-list")).toHaveCount(0);
  await expect(page.getByText("Reservado", { exact: true })).toHaveCount(0);
});

test("a booking status page 404s without a database", async ({ page }) => {
  const res = await page.goto("/agenda/AV-ABCDEF");
  expect(res?.status()).toBe(404);
});
