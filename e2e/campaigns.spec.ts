import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_USER, resetAgenda } from "./helpers";

test.beforeEach(async () => {
  await resetAgenda();
});

async function adminPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  return context.newPage();
}

async function register(page: Page, code: string, name: string, phone: string) {
  await page.goto(`/encuentros/${code}`);
  await expect(page.getByTestId("campaign-state")).toContainText("si se animan al menos 3 personas");
  const form = page.getByTestId("interest-form");
  await form.getByLabel("Tu nombre").fill(name);
  await form.getByLabel("Tu número de WhatsApp").fill(phone);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Quiero participar" }).click();
  await expect(page.getByTestId("interest-saved")).toContainText("Todavía no hay pago ni reserva");
}

async function pickFirstSlot(page: Page) {
  const days = page.locator("main").locator(
    "button[aria-label]:not([disabled]):not([aria-label*='no disponible']):not([aria-label='Mes anterior']):not([aria-label='Mes siguiente'])",
  );
  await days.first().click();
  await page.getByTestId("slot-list").getByRole("button").first().click();
}

test("a campaign goes from QR link to a booking at the campaign price, and only for registered contacts", async ({ page, browser }) => {
  const admin = await adminPage(browser);
  await admin.goto("/admin/campaigns");
  const form = admin.getByTestId("campaign-form");
  await form.getByLabel("Nombre del encuentro").fill("Encuentro en casa de Marta");
  await form.getByLabel("Cupos promocionales").fill("2");
  await form.getByLabel("Condiciones visibles").fill("Una primera sesión por persona.");
  await form.getByRole("button", { name: "Crear campaña" }).click();
  await expect(admin.getByTestId("admin-notice")).toHaveText("Guardado.");
  const card = admin.getByTestId("campaign-card").first();
  await expect(card.getByTestId("campaign-status")).toHaveText("Recogiendo interés");
  const link = (await card.getByTestId("campaign-link").textContent())!;
  const code = link.split("/encuentros/")[1];
  expect(code).toMatch(/^E-[A-Z2-9]{8}$/);

  // The public page shows no price commitment before activation, and unknown codes say so,
  // on the campaign page and on the agenda (well-formed or not).
  const unknown = await page.goto("/encuentros/E-NOPE1234");
  expect(unknown?.status()).toBe(200);
  await expect(page.getByTestId("campaign-state")).toContainText("Revisa el código");
  await page.goto("/agenda?campana=E-ABCDEFGH");
  await expect(page.getByTestId("campaign-notice")).toContainText("no corresponde a una campaña");
  await expect(page.getByTestId("agenda-price")).toHaveText("COP 149.900");
  await page.goto(`/agenda?campana=${code}`);
  await expect(page.getByTestId("campaign-notice")).toContainText("todavía no se ha activado");

  // Three distinct adults register; one of them twice with another spelling.
  await register(page, code, "Ana", "+57 300 111 0001");
  await register(page, code, "Ana otra vez", "0057 3001110001");
  await register(page, code, "Bea", "+57 300 111 0002");
  await register(page, code, "Cami", "+57 300 111 0003");

  await admin.reload();
  await expect(card.getByTestId("campaign-registered")).toHaveText("3");

  // Activation by hand, default 48-hour window.
  await card.getByRole("button", { name: "Activar campaña" }).click();
  await expect(admin.getByTestId("admin-notice")).toHaveText("Guardado.");
  await expect(card.getByTestId("campaign-status")).toHaveText("Activa");

  // The public page now shows the offer with its deadline and conditions.
  await page.goto(`/encuentros/${code}`);
  await expect(page.getByTestId("campaign-state")).toContainText("COP 98.900");
  await expect(page.getByTestId("campaign-closes").getByTestId("local-instant")).toContainText("Colombia");
  await expect(page.getByTestId("campaign-conditions")).toContainText("Una primera sesión por persona.");
  await page.getByRole("link", { name: "Reservar con esta tarifa" }).click();
  await expect(page).toHaveURL(new RegExp(`campana=${code}`));
  await expect(page.getByTestId("agenda-price")).toHaveText("COP 98.900");
  await expect(page.getByTestId("agenda-offer")).toContainText("Encuentro en casa de Marta");

  // A contact that never registered is refused, never charged the general price silently.
  await pickFirstSlot(page);
  await page.getByLabel("Tu nombre").fill("Desconocido");
  await page.getByLabel("Tu número de WhatsApp").fill("+57 300 999 0000");
  await page.getByRole("button", { name: "Reservar este horario" }).click();
  await expect(page.getByTestId("booking-error")).toContainText("no aparece registrado");

  // A registered contact, spelled differently, gets the campaign price frozen on the order.
  await page.goto(`/agenda?campana=${code}`);
  await pickFirstSlot(page);
  await page.getByLabel("Tu nombre").fill("Ana");
  await page.getByLabel("Tu número de WhatsApp").fill("+57 (300) 111-0001");
  await page.getByRole("button", { name: "Reservar este horario" }).click();
  await expect(page.getByTestId("booking-created")).toBeVisible();
  const bookingCode = (await page.getByTestId("booking-code").textContent())!.trim();

  await admin.goto("/admin");
  const row = admin.locator(`tr[data-code="${bookingCode}"]`);
  await expect(row).toContainText("COP 98.900");
  await admin.goto("/admin/campaigns");
  await expect(admin.getByTestId("campaign-card").first().getByTestId("campaign-used")).toHaveText("1 de 2");

  // The same link without the campaign price for someone who comes late: closing the campaign.
  await admin.getByTestId("campaign-card").first().getByRole("button", { name: "Cerrar campaña" }).click();
  await page.goto(`/encuentros/${code}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Esta oferta ya está cerrada");
  await expect(page.getByRole("link", { name: "Consultar disponibilidad general" })).toHaveAttribute("href", "/agenda");
  await page.goto(`/agenda?campana=${code}`);
  await expect(page.getByTestId("campaign-notice")).toContainText("precio general");
  await expect(page.getByTestId("agenda-price")).toHaveText("COP 149.900");
});

test("activation below the threshold needs the explicit checkbox", async ({ page, browser }) => {
  const admin = await adminPage(browser);
  await admin.goto("/admin/campaigns");
  const form = admin.getByTestId("campaign-form");
  await form.getByLabel("Nombre del encuentro").fill("Grupo pequeño");
  await form.getByRole("button", { name: "Crear campaña" }).click();
  const card = admin.getByTestId("campaign-card").first();
  const code = (await card.getByTestId("campaign-link").textContent())!.split("/encuentros/")[1];
  await register(page, code, "Solo Uno", "+57 300 222 0001");

  await admin.reload();
  await card.getByRole("button", { name: "Activar campaña" }).click();
  await expect(admin.getByTestId("admin-notice")).toContainText("Aún no se alcanza el umbral");
  await expect(card.getByTestId("campaign-status")).toHaveText("Recogiendo interés");

  await card.getByLabel("Activar aunque no se alcance el umbral").check();
  await card.getByRole("button", { name: "Activar campaña" }).click();
  await expect(card.getByTestId("campaign-status")).toHaveText("Activa");
});
