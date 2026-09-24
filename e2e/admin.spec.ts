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

test("admin creates a booking by hand, confirmed, and the public agenda loses that time", async ({ browser }) => {
  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  const page = await context.newPage();
  await page.goto("/admin");
  const form = page.getByTestId("manual-booking-form");
  // A date the rules offer: the first Monday at least a week ahead.
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7) + 7);
  const date = d.toISOString().slice(0, 10);
  await form.getByLabel("Nombre").fill("Reserva Manual");
  await form.getByLabel("Contacto").fill("+57 300 555 0000");
  await form.getByLabel("Fecha").fill(date);
  await form.getByLabel("Pago verificado: crear confirmada").check();
  await form.getByRole("button", { name: "Crear reserva" }).click();
  await expect(page).toHaveURL(/\/admin\/bookings\//);
  await expect(page.getByTestId("booking-stage")).toHaveText("Confirmada");
  await expect(page.getByText("+573005550000")).toBeVisible();

  // The same time by hand again is refused.
  await page.goto("/admin");
  await form.getByLabel("Nombre").fill("Segunda");
  await form.getByLabel("Contacto").fill("+57 300 555 0001");
  await form.getByLabel("Fecha").fill(date);
  await form.getByRole("button", { name: "Crear reserva" }).click();
  await expect(page.getByTestId("admin-notice")).toContainText("Otra reserva activa ocupa ese horario");

  // The public agenda no longer offers that day.
  const offered = await loadAvailability();
  expect(offered.some((s) => s.date === date)).toBe(false);
  await context.close();
});
