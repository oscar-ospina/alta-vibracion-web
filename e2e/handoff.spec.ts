import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_USER, resetAgenda } from "./helpers";
import { loadAvailability } from "../lib/agenda/availability";
import { createBooking } from "../lib/agenda/bookings";

test.beforeEach(async () => {
  await resetAgenda();
});

test("Liliana pauses public bookings and resumes them without code", async ({ page, browser }) => {
  const adminContext = await browser.newContext({ httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD } });
  const admin = await adminContext.newPage();
  await admin.goto("/admin");
  await expect(admin.getByTestId("pause-state")).toHaveText("Abiertas");
  await admin.getByRole("button", { name: "Pausar reservas" }).click();
  await expect(admin.getByTestId("pause-state")).toHaveText("En pausa");

  // The public agenda shows the manual path and no slots; the server refuses too.
  await page.goto("/agenda");
  await expect(page.getByTestId("agenda-fallback")).toHaveAttribute("data-paused", "1");
  await expect(page.getByText("Las reservas están en pausa por ahora.")).toBeVisible();
  await expect(page.getByTestId("slot-list")).toHaveCount(0);
  const [slot] = await loadAvailability();
  const refused = await createBooking({
    serviceId: "yo-01",
    startsAt: slot.startsAt,
    customerName: "Durante la pausa",
    contactChannel: "whatsapp",
    contactValue: "573001234567",
    clientTimeZone: "America/Bogota",
    origin: null,
  });
  expect(refused).toEqual({ ok: false, error: "paused" });

  // The admin still books by hand while paused.
  const form = admin.getByTestId("manual-booking-form");
  await form.getByLabel("Nombre").fill("A mano en pausa");
  await form.getByLabel("Contacto").fill("+57 300 555 0002");
  await form.getByLabel("Fecha").fill(slot.date);
  await form.getByLabel("Hora (Colombia)").fill(slot.time);
  await form.getByRole("button", { name: "Crear reserva" }).click();
  await expect(admin).toHaveURL(/\/admin\/bookings\//);

  await admin.goto("/admin");
  await admin.getByRole("button", { name: "Reanudar reservas" }).click();
  await expect(admin.getByTestId("pause-state")).toHaveText("Abiertas");
  await page.goto("/agenda");
  await expect(page.getByTestId("agenda-fallback")).toHaveCount(0);
  await adminContext.close();
});

test("CSV exports need the admin credentials and carry the records in Colombia time", async ({ browser, request }) => {
  const [slot] = await loadAvailability();
  const created = await createBooking({
    serviceId: "yo-01",
    startsAt: slot.startsAt,
    customerName: "Exportada, con coma",
    contactChannel: "email",
    contactValue: "export@example.com",
    clientTimeZone: "Europe/Madrid",
    origin: "prueba",
  });
  if (!created.ok) throw new Error("setup failed");

  const anonymous = await request.get("/admin/export/bookings");
  expect(anonymous.status()).toBe(401);

  const context = await browser.newContext({ httpCredentials: { username: ADMIN_USER, password: ADMIN_PASSWORD } });
  const res = await context.request.get("/admin/export/bookings");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(res.headers()["content-disposition"]).toMatch(/alta-vibracion-bookings-\d{4}-\d{2}-\d{2}\.csv/);
  const body = await res.text();
  expect(body.charCodeAt(0)).toBe(0xfeff);
  const lines = body.trim().split("\r\n");
  expect(lines[0]).toBe("codigo,sesion,precio_cop,inicio_colombia,estado,cliente,canal,contacto,zona_cliente,origen,campana_id,bono_id,creada,confirmada,formulario,atendida,seguimiento");
  expect(lines[1]).toContain(created.booking.code);
  expect(lines[1]).toContain('"Exportada, con coma"');
  expect(lines[1]).toContain("export@example.com");
  expect(lines[1]).toContain("6:00");

  for (const table of ["interests", "campaigns", "gifts"]) {
    const other = await context.request.get(`/admin/export/${table}`);
    expect(other.status()).toBe(200);
  }
  expect((await context.request.get("/admin/export/users")).status()).toBe(404);

  const guide = await context.newPage();
  await guide.goto("/admin/guia");
  await expect(guide.getByTestId("admin-guide")).toContainText("Las cinco operaciones");
  await expect(guide.getByTestId("admin-guide")).toContainText("Qué puedes cambiar sin código");
  await context.close();
});
