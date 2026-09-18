import { expect, test, type Page } from "@playwright/test";
import { resetAgenda } from "./helpers";

test.beforeEach(async () => {
  await resetAgenda();
});

async function pickFirstSlot(page: Page) {
  const calendarDays = page.locator(
    "button[aria-label]:not([disabled]):not([aria-label*='no disponible']):not([aria-label='Mes anterior']):not([aria-label='Mes siguiente'])",
  );
  await expect(calendarDays.first()).toBeVisible();
  const label = await calendarDays.first().getAttribute("aria-label");
  await calendarDays.first().click();
  const slot = page.getByTestId("slot-list").getByRole("button").first();
  await expect(slot).toContainText("6:00");
  await expect(page.getByTestId("slot-list").getByRole("button")).toHaveCount(1);
  await slot.click();
  return label!;
}

test("books the Monday–Thursday 18:00 slot, gets a code, and the slot disappears", async ({ page }) => {
  await page.goto("/agenda?consultation=yo-01&origen=encuentro-01");
  await expect(page.getByText("Horarios en hora de Colombia.")).toBeVisible();

  const dayLabel = await pickFirstSlot(page);
  await page.getByLabel("Tu nombre").fill("Ana Prueba");
  await page.getByLabel("Tu número de WhatsApp").fill("+57 300 123 4567");
  await page.getByRole("button", { name: "Reservar este horario" }).click();

  const panel = page.getByTestId("booking-created");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Pendiente de pago");
  const code = (await page.getByTestId("booking-code").textContent())!.trim();
  expect(code).toMatch(/^AV-[A-Z2-9]{6}$/);
  const handoff = panel.getByRole("link", { name: /Enviar mi código por WhatsApp/ });
  await expect(handoff).toHaveAttribute("href", new RegExp(encodeURIComponent(code)));

  // Status page by code.
  await page.goto(`/agenda/${code}`);
  await expect(page.getByTestId("booking-status")).toHaveText("Pendiente de pago");

  // The day no longer offers a slot.
  await page.goto("/agenda");
  const sameDay = page.locator(`button[aria-label="${dayLabel}"]`);
  await expect(sameDay).toHaveCount(0);
  await expect(page.locator(`button[aria-label="${dayLabel} — no disponible"]`)).toBeDisabled();
});

test("shows the visitor's own time next to Bogotá when the zone is Madrid", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "Europe/Madrid", locale: "es-ES" });
  const page = await context.newPage();
  await page.goto("/agenda");
  await expect(page.locator("#booking-tz")).toHaveValue("Europe/Madrid");
  await pickFirstSlot(page);
  await expect(page.getByTestId("slot-list")).toContainText("en tu zona");
  await page.getByLabel("Tu nombre").fill("Marta");
  await page.getByText("Correo", { exact: true }).click();
  await page.getByLabel("Tu correo").fill("marta@example.com");
  await page.getByRole("button", { name: "Reservar este horario" }).click();
  const local = page.getByTestId("booking-local-time");
  await expect(local).toContainText("Europe/Madrid");
  // 18:00 Bogotá is 01:00 (CEST) or 00:00 (CET) in Madrid: always the next day, small hours.
  await expect(local).toContainText(/1:00|12:00/);
  await context.close();
});

test("a second visitor cannot take a held slot", async ({ page, browser }) => {
  await page.goto("/agenda");
  await pickFirstSlot(page);
  const other = await (await browser.newContext()).newPage();
  await other.goto("/agenda");
  await pickFirstSlot(other);

  await page.getByLabel("Tu nombre").fill("Primera");
  await page.getByLabel("Tu número de WhatsApp").fill("+57 300 000 0001");
  await page.getByRole("button", { name: "Reservar este horario" }).click();
  await expect(page.getByTestId("booking-created")).toBeVisible();

  await other.getByLabel("Tu nombre").fill("Segunda");
  await other.getByLabel("Tu número de WhatsApp").fill("+57 300 000 0002");
  await other.getByRole("button", { name: "Reservar este horario" }).click();
  await expect(other.getByTestId("booking-error")).toContainText(/se acaba de ocupar|ya no está disponible/);
  await expect(other.getByTestId("booking-created")).toHaveCount(0);
});
