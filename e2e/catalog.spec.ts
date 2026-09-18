import { expect, test } from "@playwright/test";

test("home shows the three plan services with their prices", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#sesiones");
  await expect(section.getByRole("heading", { name: "Mi Mapa 729", exact: true })).toBeVisible();
  await expect(section.getByRole("heading", { name: "Mi siguiente paso 729" })).toBeVisible();
  await expect(section.getByRole("heading", { name: "Regala Mi Mapa 729" })).toBeVisible();
  await expect(section.getByText("COP 149.900")).toHaveCount(2);
  await expect(section.getByText("COP 179.900")).toHaveCount(1);
  await expect(section.getByText("Solo para quienes ya tuvieron su primera sesión.")).toBeVisible();
  await expect(section.getByText(/herramienta simbólica de reflexión/)).toBeVisible();

  // Old catalog must be gone.
  await expect(page.getByText("Numerología Esencial")).toHaveCount(0);
  await expect(page.getByText("COP 150.000")).toHaveCount(0);

  // Gift goes to WhatsApp, not the agenda.
  const gift = section.getByRole("link", { name: /Preguntar por Regala Mi Mapa 729/ });
  await expect(gift).toHaveAttribute("href", /wa\.me/);
  const book = section.getByRole("link", { name: /Consultar horarios para Mi Mapa 729/ });
  await expect(book).toHaveAttribute("href", "/agenda?consultation=yo-01");
});
