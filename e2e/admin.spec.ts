import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_USER, resetAgenda } from "./helpers";
import { createBooking } from "../lib/agenda/bookings";
import { loadAvailability } from "../lib/agenda/availability";

test.beforeEach(async () => {
  await resetAgenda();
});

test("admin is challenged without credentials", async ({ page }) => {
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(401);
  expect(res?.headers()["www-authenticate"]).toMatch(/Basic/);
});

test("admin confirms a pending booking and the status page follows", async ({ browser }) => {
  const [slot] = await loadAvailability();
  const created = await createBooking({
    serviceId: "yo-01",
    startsAt: slot.startsAt,
    customerName: "Cliente Admin",
    contactChannel: "email",
    contactValue: "cliente@example.com",
    clientTimeZone: "America/Bogota",
    origin: null,
  });
  if (!created.ok) throw new Error("setup failed");
  const code = created.booking.code;

  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  const page = await context.newPage();
  await page.goto("/admin");
  const row = page.locator(`tr[data-code="${code}"]`);
  await expect(row.getByTestId("admin-status")).toHaveText("Pendiente de pago");
  await row.getByRole("button", { name: "Confirmar pago" }).click();
  await expect(row.getByTestId("admin-status")).toHaveText("Confirmada");

  await page.goto(`/agenda/${code}`);
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmada");
  await context.close();
});

test("closing a day removes its slot from the public agenda", async ({ browser }) => {
  const [slot] = await loadAvailability();
  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  const page = await context.newPage();
  await page.goto("/admin");
  await page.locator("#ov-date").fill(slot.date);
  await page.locator("#ov-kind").selectOption("closed");
  await page.locator("#ov-note").fill("Prueba E2E");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByTestId("overrides-list")).toContainText("Prueba E2E");

  const remaining = await loadAvailability();
  expect(remaining.some((s) => s.date === slot.date)).toBe(false);
  await context.close();
});
