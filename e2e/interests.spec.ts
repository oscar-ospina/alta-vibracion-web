import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_USER, resetAgenda } from "./helpers";

test.beforeEach(async () => {
  await resetAgenda();
});

async function fillInterest(page: Page, name: string, phone: string) {
  const form = page.getByTestId("interest-form");
  await form.getByLabel("Tu nombre").fill(name);
  await form.getByLabel("Tu número de WhatsApp").fill(phone);
  await form.getByRole("checkbox").check();
}

test("a future service registers interest once, even when the form is sent twice", async ({ page, browser }) => {
  await page.goto("/yo");
  await page.getByRole("button", { name: /Avísame cuando esté disponible: Mi Camino 729/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Mi Camino 729" })).toBeVisible();
  await expect(dialog.getByText(/COP/)).toHaveCount(0);
  // A phone without a country code is refused, and the typed values survive the error.
  await fillInterest(page, "Ana Interés", "300 111 2233");
  await dialog.getByRole("button", { name: "Avísame cuando esté disponible" }).click();
  await expect(page.getByTestId("interest-error")).toContainText("indicativo de país");
  await expect(dialog.getByLabel("Tu nombre")).toHaveValue("Ana Interés");
  await dialog.getByLabel("Tu número de WhatsApp").fill("+57 300 111 2233");
  await dialog.getByRole("button", { name: "Avísame cuando esté disponible" }).click();
  const saved = page.getByTestId("interest-saved");
  await expect(saved).toContainText("Te avisaremos cuando tengamos una propuesta lista.");
  await expect(saved).toContainText("no es una reserva ni implica pago");

  // Same person, other spelling of the number.
  await page.goto("/yo/mi-camino-729");
  await page.getByRole("button", { name: /Avísame cuando esté disponible: Mi Camino 729/ }).click();
  await fillInterest(page, "Ana Otra Vez", "0057 3001112233");
  await page.getByRole("dialog").getByRole("button", { name: "Avísame cuando esté disponible" }).click();
  await expect(page.getByTestId("interest-saved")).toBeVisible();

  const adminContext = await browser.newContext({ httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD } });
  const admin = await adminContext.newPage();
  await admin.goto("/admin/interests");
  const rows = admin.getByTestId("interests-service").getByRole("listitem");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Ana Interés");
  await expect(rows.first()).toContainText("+573001112233");
  await expect(rows.first()).toContainText("Mi Camino 729");

  await rows.first().getByRole("button", { name: "Contactado" }).click();
  await expect(admin.getByTestId("admin-notice")).toHaveText("Guardado.");
  await expect(admin.getByTestId("interests-service")).toHaveCount(0);
  await adminContext.close();
});

test("the gift inquiry reaches the admin without any data about the beneficiary", async ({ page, browser }) => {
  await page.goto("/regalar");
  const form = page.getByTestId("interest-form");
  await expect(form.getByLabel(/nacimiento|beneficiario|para quién/i)).toHaveCount(0);
  await form.getByLabel("Tu nombre").fill("Carlos Regala");
  await form.getByText("Correo", { exact: true }).click();
  await form.getByLabel("Tu correo").fill("Carlos@Example.com");
  await form.getByLabel(/Mensaje o dedicatoria/).fill("Para mi pareja");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Quiero regalar esta experiencia" }).click();
  await expect(page.getByTestId("interest-saved")).toContainText("antes de cualquier pago");

  const adminContext = await browser.newContext({ httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD } });
  const admin = await adminContext.newPage();
  await admin.goto("/admin/interests");
  const row = admin.getByTestId("interests-gift").getByRole("listitem").first();
  await expect(row).toContainText("Carlos Regala");
  await expect(row).toContainText("carlos@example.com");
  await expect(row).toContainText("Para mi pareja");
  await adminContext.close();
});

test("a company registers its organization and topic", async ({ page, browser }) => {
  await page.goto("/empresas");
  await page.getByRole("button", { name: /Soy empresa y me interesa: Equipos con Sentido/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tu nombre").fill("Lucía RH");
  await dialog.getByLabel("Organización").fill("Acme SAS");
  await dialog.getByLabel("Qué te gustaría explorar").fill("Un taller para el equipo");
  await dialog.getByLabel("Tu número de WhatsApp").fill("+57 310 000 0000");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Soy empresa y me interesa" }).click();
  await expect(page.getByTestId("interest-saved")).toBeVisible();

  const adminContext = await browser.newContext({ httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD } });
  const admin = await adminContext.newPage();
  await admin.goto("/admin/interests");
  const row = admin.getByTestId("interests-company").getByRole("listitem").first();
  await expect(row).toContainText("Acme SAS");
  await expect(row).toContainText("Un taller para el equipo");
  await adminContext.close();
});
