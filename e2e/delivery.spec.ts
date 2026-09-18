import { expect, test, type Browser } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_USER, resetAgenda } from "./helpers";
import { createBooking, setBookingStatus } from "../lib/agenda/bookings";
import { loadAvailability } from "../lib/agenda/availability";

test.beforeEach(async () => {
  await resetAgenda();
});

async function confirmedBooking() {
  const [slot] = await loadAvailability();
  const created = await createBooking({
    serviceId: "yo-01",
    startsAt: slot.startsAt,
    customerName: "Cliente Entrega",
    contactChannel: "email",
    contactValue: "entrega@example.com",
    clientTimeZone: "America/Bogota",
    origin: null,
  });
  if (!created.ok) throw new Error("setup failed");
  const confirmed = await setBookingStatus(created.booking.id, "confirmed");
  if (!confirmed.ok) throw new Error("setup failed");
  return confirmed.booking;
}

async function adminPage(browser: Browser) {
  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  return { context, page: await context.newPage() };
}

test("the pending lists, the marks and the report follow the plan's pipeline", async ({ browser, page: visitor }) => {
  const b = await confirmedBooking();
  const { context, page } = await adminPage(browser);

  // Confirmed and nothing marked: the form is pending, nothing to deliver.
  await page.goto("/admin");
  await expect(page.getByTestId("pending-intake").locator(`[data-code="${b.code}"]`)).toBeVisible();
  await expect(page.getByTestId("pending-deliveries")).toHaveCount(0);
  await page.getByTestId("bookings-table").getByRole("link", { name: b.code }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/bookings/${b.id}$`));
  await expect(page.getByTestId("booking-stage")).toHaveText("Confirmada");

  // Approving before the session is refused.
  await page.getByLabel("Aprobado").check();
  await page.getByRole("button", { name: "Guardar resumen" }).click();
  await expect(page.getByTestId("admin-notice")).toContainText("Marca primero la sesión");
  await expect(page.getByTestId("report-status")).toHaveText("Sin informe");

  await page.getByRole("button", { name: "Marcar recibido" }).click();
  await expect(page.getByTestId("mark-intake")).toContainText("recibido");
  await page.getByRole("button", { name: "Marcar sesión realizada" }).click();
  await expect(page.getByTestId("mark-attended")).toContainText("realizada");
  await expect(page.getByTestId("booking-stage")).toHaveText("Sesión realizada");

  // A draft never reaches the client.
  const body = page.locator("#report-body");
  await expect(body).toHaveValue(new RegExp(`Código: ${b.code}`));
  await body.fill("# Tu resumen\n\nTexto solo para Liliana todavía.");
  await page.getByLabel("Borrador").check();
  await page.getByRole("button", { name: "Guardar resumen" }).click();
  await expect(page.getByTestId("report-status")).toHaveText("Borrador");
  await visitor.goto(`/agenda/${b.code}`);
  await expect(visitor.getByTestId("booking-status")).toHaveText("Sesión realizada");
  await expect(visitor.getByTestId("booking-report")).toHaveCount(0);
  await expect(visitor.getByText("solo para Liliana")).toHaveCount(0);

  // The admin list now shows the delivery as pending, and the form as received.
  await page.goto("/admin");
  await expect(page.getByTestId("pending-intake")).toHaveCount(0);
  await expect(page.getByTestId("pending-deliveries").locator(`[data-code="${b.code}"]`)).toContainText("Borrador");
  await expect(page.locator(`tr[data-code="${b.code}"]`).getByRole("button", { name: "Cancelar" })).toHaveCount(0);

  // Approved: the client sees it, the delivery leaves the pending list.
  await page.goto(`/admin/bookings/${b.id}`);
  await page.locator("#report-body").fill("# Tu resumen\n\nTres acciones para esta semana.");
  await page.getByLabel("Aprobado").check();
  await page.getByRole("button", { name: "Guardar resumen" }).click();
  await expect(page.getByTestId("report-status")).toHaveText("Aprobado");
  await expect(page.getByTestId("booking-stage")).toHaveText("Resumen entregado");
  await visitor.goto(`/agenda/${b.code}`);
  await expect(visitor.getByTestId("booking-status")).toHaveText("Resumen entregado");
  await expect(visitor.getByTestId("booking-report")).toContainText("Tres acciones para esta semana");
  await page.goto("/admin");
  await expect(page.getByTestId("pending-deliveries")).toHaveCount(0);
  await context.close();
});

test("the script and the week plan open behind the same credentials", async ({ browser, page: anon }) => {
  const res = await anon.goto("/admin/script");
  expect(res?.status()).toBe(401);
  const { context, page } = await adminPage(browser);
  await page.goto("/admin/script");
  await expect(page.getByTestId("admin-script")).toContainText("Sesión inicial, 75 minutos");
  await expect(page.getByTestId("admin-script")).toContainText("Lista de revisión antes de entregar");
  await expect(page.getByTestId("admin-week-plan").locator("table")).toBeVisible();
  await context.close();
});
