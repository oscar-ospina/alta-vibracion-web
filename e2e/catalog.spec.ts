import { expect, test } from "@playwright/test";

/**
 * Plan V2.1 (section 12, row 1): only YO-01 can start a purchase, the gift
 * entry is visible in four places, future services capture interest and show
 * no price. Section 1 forbids the old continuity price.
 */

test("home sells only Mi Mapa 729 and shows no continuity price", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#sesiones");
  await expect(section.getByRole("heading", { name: "Mi Mapa 729", exact: true })).toBeVisible();
  await expect(section.getByText("COP 149.900")).toHaveCount(1);
  await expect(section.getByText(/herramienta simbólica de reflexión/)).toBeVisible();
  const book = section.getByRole("link", { name: /Elegir horario para Mi Mapa 729/ });
  await expect(book).toHaveAttribute("href", "/agenda?consultation=yo-01");
  await expect(section.getByRole("link", { name: /Regalar esta cita/ })).toHaveAttribute("href", "/regalar");

  // Retired: the continuity service and its price, the separate gift service.
  await expect(page.getByText("Mi siguiente paso 729")).toHaveCount(0);
  await expect(page.getByText("COP 179.900")).toHaveCount(0);
  await expect(page.getByText("Solo para quienes ya tuvieron su primera sesión.")).toHaveCount(0);

  // The universe lists the lines with their future services, no prices.
  const universe = page.getByTestId("universe");
  for (const name of ["Yo · 7", "Nosotros · 2", "Celebremos · 9", "Empresas"]) {
    await expect(universe.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(universe.getByText("Mi Camino 729 · en preparación")).toBeVisible();
  await expect(universe.getByText(/COP/)).toHaveCount(0);
});

test("the gift entry is visible on the home, the menu, Mi Mapa 729 and Celebremos", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Regalar una cita" })).toHaveAttribute("href", "/regalar");
  await expect(header.getByRole("link", { name: "Quiero mi primera sesión" })).toHaveAttribute("href", "/agenda");
  const hero = page.getByRole("heading", { level: 1 }).locator("xpath=ancestor::section");
  await expect(hero.getByRole("link", { name: "Regalar una cita" })).toHaveAttribute("href", "/regalar");

  await page.goto("/yo/mi-mapa-729");
  await expect(page.getByRole("heading", { level: 1, name: "Mi Mapa 729" })).toBeVisible();
  await expect(page.getByTestId("service-buy-card").getByText("COP 149.900")).toBeVisible();
  await expect(page.getByTestId("service-buy-card").getByRole("link", { name: /Regalar esta cita/ })).toHaveAttribute("href", "/regalar");

  await page.goto("/celebremos");
  const gift = page.getByTestId("gift-block");
  await expect(gift).toBeVisible();
  await expect(gift.getByRole("link", { name: "Regalar una cita" })).toHaveAttribute("href", "/regalar");
  // The gift block comes before the future cards.
  const giftBox = await gift.boundingBox();
  const cardsBox = await page.getByTestId("line-celebremos").boundingBox();
  expect(giftBox!.y).toBeLessThan(cardsBox!.y);

  await page.goto("/regalar");
  await expect(page.getByRole("heading", { level: 1, name: "Hay regalos que invitan a descubrirse" })).toBeVisible();
  await expect(page.getByTestId("gift-steps").getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText("El informe pertenece a quien toma la sesión.")).toBeVisible();
  await expect(page.getByText("Antes del pago confirmaremos disponibilidad, forma de entrega y condiciones del regalo.")).toBeVisible();
  await expect(page.getByTestId("gift-inquiry").getByRole("link", { name: /Quiero regalar esta experiencia/ })).toHaveAttribute("href", /wa\.me/);
});

test("the mobile menu exposes every line and both CTAs", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Abrir menú" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const nav = page.getByTestId("mobile-nav");
  await expect(nav).toBeVisible();
  for (const label of ["Inicio", "Yo · 7", "Nosotros · 2", "Celebremos · 9", "Empresas"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  // On a phone the panel carries the menu link and the CTA button for the gift.
  await expect(nav.getByRole("link", { name: "Regalar una cita", exact: true })).toHaveCount(2);
  await expect(nav.getByRole("link", { name: "Quiero mi primera sesión" })).toBeVisible();
  await nav.getByRole("link", { name: "Yo · 7", exact: true }).click();
  await expect(page).toHaveURL(/\/yo$/);
  await expect(page.getByTestId("mobile-nav")).toHaveCount(0);
  await context.close();
});

test("future services show no price and no booking, on the line pages and their detail pages", async ({ page }) => {
  await page.goto("/yo");
  const cards = page.getByTestId("line-yo");
  await expect(cards.locator(":scope > li")).toHaveCount(3);
  await expect(cards.getByText("En preparación")).toHaveCount(2);
  await expect(cards.getByText(/COP/)).toHaveCount(1);
  await expect(cards.getByRole("link", { name: /Avísame cuando esté disponible: Mi Camino 729/ })).toHaveAttribute("href", /wa\.me/);
  await expect(page.getByText("Este registro no es una reserva ni implica pago.", { exact: false })).toBeVisible();

  await page.goto("/yo/mi-camino-729");
  await expect(page.getByRole("heading", { level: 1, name: "Mi Camino 729" })).toBeVisible();
  await expect(page.getByText("En preparación")).toBeVisible();
  await expect(page.getByText(/COP/)).toHaveCount(0);
  await expect(page.getByTestId("service-buy-card")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Elegir horario/ })).toHaveCount(0);

  await page.goto("/nosotros");
  await expect(page.getByTestId("line-nosotros").locator(":scope > li")).toHaveCount(4);
  await expect(page.getByText(/COP/)).toHaveCount(0);
  await page.goto("/nosotros/match");
  await expect(page.getByRole("link", { name: /Quiero conocer el proyecto/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /alta-code/ })).toHaveCount(0);

  await page.goto("/empresas");
  await expect(page.getByTestId("line-empresas").locator(":scope > li")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /Soy empresa y me interesa/ })).toBeVisible();

  // Unknown slugs 404.
  const res = await page.goto("/yo/no-existe");
  expect(res?.status()).toBe(404);
});

test("the agenda only offers the first session, whatever the URL says", async ({ page }) => {
  await page.goto("/agenda?consultation=yo-02");
  await expect(page.getByTestId("agenda-service")).toHaveText("Mi Mapa 729");
  await expect(page.getByText("COP 149.900")).toBeVisible();
});
