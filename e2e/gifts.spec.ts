import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_USER, resetAgenda } from "./helpers";

test.beforeEach(async () => {
  await resetAgenda();
});

async function pickFirstSlot(page: Page) {
  const days = page.locator("main").locator(
    "button[aria-label]:not([disabled]):not([aria-label*='no disponible']):not([aria-label='Mes anterior']):not([aria-label='Mes siguiente'])",
  );
  await days.first().click();
  await page.getByTestId("slot-list").getByRole("button").first().click();
}

test("from the gift inquiry to a confirmed session for the beneficiary, with a single-use voucher", async ({ page, browser }) => {
  // The buyer asks on /regalar.
  await page.goto("/regalar");
  const form = page.getByTestId("interest-form");
  await form.getByLabel("Tu nombre").fill("Carlos Regala");
  await form.getByLabel("Tu número de WhatsApp").fill("+57 300 111 0001");
  await form.getByLabel(/Mensaje o dedicatoria/).fill("Para que te conozcas un poco más.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Quiero regalar esta experiencia" }).click();
  await expect(page.getByTestId("interest-saved")).toBeVisible();

  // Liliana turns the inquiry into an order, then marks it paid.
  const adminContext = await browser.newContext({ httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD } });
  const admin = await adminContext.newPage();
  await admin.goto("/admin/interests");
  await admin.getByTestId("interests-gift").getByRole("button", { name: "Crear orden de regalo" }).click();
  await expect(admin).toHaveURL(/\/admin\/gifts/);
  const row = admin.getByTestId("gift-orders").getByTestId("gift-row").first();
  await expect(row.getByTestId("gift-status")).toHaveText("Pendiente de pago");
  await expect(row).toContainText("Carlos Regala");
  const link = (await row.getByTestId("gift-link").textContent())!;
  const code = link.split("/regalar/")[1];
  expect(code).toMatch(/^RG-[A-Z2-9]{8}$/);

  // Before payment the invitation does not open a booking.
  await page.goto(`/regalar/${code}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("aún no está confirmado");
  await page.goto(`/agenda?bono=${code}`);
  await expect(page.getByTestId("campaign-notice")).toContainText("aún no está confirmado");
  await expect(page.getByTestId("agenda-price")).toHaveText("COP 149.900");

  await row.getByRole("button", { name: "Pago verificado" }).click();
  await expect(admin.getByTestId("admin-notice")).toHaveText("Guardado.");
  await expect(admin.getByTestId("gifts-to-schedule").getByTestId("gift-row")).toHaveCount(1);
  await expect(admin.getByTestId("gift-capacity")).toContainText("Bonos pagados sin horario: 1");

  // The beneficiary reads the invitation and books with her own data, without paying.
  await page.goto(`/regalar/${code}`);
  await expect(page.getByTestId("gift-state")).toContainText("Carlos Regala te regala Mi Mapa 729");
  await expect(page.getByTestId("gift-message")).toHaveText("Para que te conozcas un poco más.");
  await page.getByRole("link", { name: "Aceptar y elegir mi horario" }).click();
  await expect(page).toHaveURL(new RegExp(`bono=${code}`));
  await expect(page.getByTestId("agenda-price")).toHaveText("Regalo");
  await expect(page.getByTestId("agenda-voucher")).toContainText("Carlos Regala");
  await pickFirstSlot(page);
  await page.getByLabel("Tu nombre").fill("Beneficiaria");
  await page.getByLabel("Tu número de WhatsApp").fill("+57 300 999 0009");
  await page.getByRole("button", { name: "Reservar este horario" }).click();
  const panel = page.getByTestId("booking-created");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("created-status")).toHaveText("Confirmada");
  await expect(panel.getByTestId("gift-confirmed")).toBeVisible();
  await expect(panel.getByTestId("payment-box")).toHaveCount(0);
  const bookingCode = (await page.getByTestId("booking-code").textContent())!.trim();

  await page.goto(`/agenda/${bookingCode}`);
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmada");
  await expect(page.getByText("Regalo ya pagado")).toBeVisible();
  await expect(page.getByTestId("payment-box")).toHaveCount(0);

  // The voucher is spent: the invitation says so and the agenda refuses it.
  await page.goto(`/regalar/${code}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ya fue canjeado");
  await page.goto(`/agenda?bono=${code}`);
  await expect(page.getByTestId("campaign-notice")).toContainText("ya fue canjeado");

  // The admin sees the sale once, on the order, and the booking as a redeemed gift.
  await admin.goto("/admin/gifts");
  await expect(admin.getByTestId("gift-orders").getByTestId("gift-row").first().getByTestId("gift-status")).toHaveText("Canjeado");
  await expect(admin.getByTestId("gifts-to-schedule")).toHaveCount(0);
  await admin.goto("/admin");
  const bookingRow = admin.locator(`tr[data-code="${bookingCode}"]`);
  await expect(bookingRow).toContainText("Regalo canjeado");
  await expect(bookingRow.getByTestId("admin-status")).toHaveText("Confirmada");
  await adminContext.close();
});

test("an unknown voucher gets a clear message and the general price", async ({ page }) => {
  await page.goto("/regalar/RG-NOPE1234");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("no corresponde a un regalo");
  await page.goto("/agenda?bono=RG-NOPE1234");
  await expect(page.getByTestId("campaign-notice")).toContainText("no es válido");
  await expect(page.getByTestId("agenda-price")).toHaveText("COP 149.900");
});
