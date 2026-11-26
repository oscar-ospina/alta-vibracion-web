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
  await page.goto("/admin/schedule");
  await page.locator("#ov-date").fill(slot.date);
  await page.locator("#ov-kind").selectOption("closed");
  await page.locator("#ov-note").fill("Prueba E2E");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByTestId("closures-list")).toContainText("Prueba E2E");

  const remaining = await loadAvailability();
  expect(remaining.some((s) => s.date === slot.date)).toBe(false);
  await context.close();
});

test("the schedule page is challenged without credentials", async ({ page }) => {
  const res = await page.goto("/admin/schedule");
  expect(res?.status()).toBe(401);
});

test("every admin page shows the admin and public links", async ({ browser }) => {
  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  const page = await context.newPage();
  await page.goto("/admin");
  const nav = page.getByTestId("admin-nav");
  await nav.getByRole("link", { name: "Horarios y vacaciones" }).click();
  await expect(page).toHaveURL(/\/admin\/schedule$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Horarios");
  await expect(nav.getByRole("link", { name: "Agenda", exact: true })).toHaveAttribute("href", "/agenda");
  await context.close();
});

test("deactivating a weekly rule removes that weekday from the agenda; a new rule adds one", async ({ browser }) => {
  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  const page = await context.newPage();
  await page.goto("/admin/schedule");

  const monday = page.locator('[data-rule="1-18:00"]');
  await monday.getByRole("button", { name: "Desactivar" }).click();
  await expect(monday.getByTestId("rule-state")).toHaveText("Desactivado");
  let slots = await loadAvailability();
  expect(slots.length).toBeGreaterThan(0);
  expect(slots.every((s) => new Date(`${s.date}T12:00:00Z`).getUTCDay() !== 1)).toBe(true);

  // An overlapping rule on an active day is refused.
  await page.locator("#rule-weekday").selectOption("2");
  await page.locator("#rule-time").fill("19:00");
  await page.getByRole("button", { name: "Agregar horario" }).click();
  await expect(page.getByTestId("admin-notice")).toContainText("se cruza");

  await page.locator("#rule-weekday").selectOption("6");
  await page.locator("#rule-time").fill("10:00");
  await page.locator("#rule-duration").fill("90");
  await page.getByRole("button", { name: "Agregar horario" }).click();
  await expect(page.locator('[data-rule="6-10:00"]')).toContainText("90 min");
  slots = await loadAvailability();
  expect(slots.some((s) => s.time === "10:00" && s.durationMinutes === 90)).toBe(true);
  await context.close();
});

test("blocking a vacation range leaves no slots inside it, and reopening brings them back", async ({ browser }) => {
  const all = await loadAvailability();
  const from = all[0].date;
  const to = all[Math.min(5, all.length - 1)].date;
  // A booking inside the range stays, and the page points at it.
  const booked = await createBooking({
    serviceId: "yo-01",
    startsAt: all[1].startsAt,
    customerName: "Cliente Vacaciones",
    contactChannel: "email",
    contactValue: "vacaciones@example.com",
    clientTimeZone: "America/Bogota",
    origin: null,
  });
  if (!booked.ok) throw new Error("setup failed");
  const before = await loadAvailability();
  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  const page = await context.newPage();
  await page.goto("/admin/schedule");
  await page.locator("#vac-from").fill(from);
  await page.locator("#vac-to").fill(to);
  await page.getByRole("button", { name: "Bloquear días" }).click();
  const closures = page.getByTestId("closures-list");
  await expect(closures).toContainText("Vacaciones");
  await expect(closures.locator("li")).toHaveCount(1);
  await expect(closures.getByTestId("closure-bookings")).toContainText(booked.booking.code);

  const during = await loadAvailability();
  expect(during.some((s) => s.date >= from && s.date <= to)).toBe(false);

  await closures.getByRole("button", { name: "Reabrir" }).click();
  await expect(page.getByTestId("closures-list")).toHaveCount(0);
  expect((await loadAvailability()).length).toBe(before.length);
  await context.close();
});
