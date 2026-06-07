import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@saas/ui";
import { Logo } from "@/components/brand/logo";

/**
 * Brand-theme proof page (story oscar-ospina/saas-planner#20). Throwaway before
 * the real Home (#23) — it just demonstrates the brand layer is live:
 *  · the logo lockup (links to Home)            — AC #3
 *  · headings in Archivo @ -0.25px tracking     — AC #1 (via the brand base layer)
 *  · brand colors read brand tokens, not hex    — AC #2
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      {/* AC #3 — logo lockup, links to Home */}
      <Logo className="h-10 w-auto" />

      <Badge>Alta Vibración</Badge>

      {/* AC #1 — Archivo + -0.25px tracking come from the brand base layer; no
          font-display / tracking utility here on purpose, to prove the default. */}
      <h1 className="text-5xl font-bold text-foreground">
        Conecta con tu esencia a través de los números
      </h1>

      {/* Body — Open Sans via --font-sans */}
      <p className="max-w-md text-lg text-muted-foreground">
        Capa de marca aplicada — fuentes, tokens y logo sobre{" "}
        <code>@saas/ui</code>. <em>No es casualidad. Es vibración.</em>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button>Agenda tu cita</Button>
        {/* AC #2 — brand-colored link reads the AA-legible brand ink token */}
        <a
          href="#"
          className="font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          Numerología
        </a>
      </div>

      {/* AC #2 — brand color swatches read brand tokens (bg-brand / bg-brand-accent
          fills, text-brand-ink). Labels sit on the page bg to stay AA-legible. */}
      <ul className="flex items-end justify-center gap-6 text-xs text-muted-foreground">
        <li className="flex flex-col items-center gap-1.5">
          <span className="h-12 w-12 rounded-xl bg-brand" />
          <code>brand</code>
        </li>
        <li className="flex flex-col items-center gap-1.5">
          <span className="h-12 w-12 rounded-xl bg-brand-accent" />
          <code>brand-accent</code>
        </li>
        <li className="flex flex-col items-center gap-1.5">
          <span className="h-12 w-12 rounded-xl ring-1 ring-border" />
          <code className="text-brand-ink">brand-ink</code>
        </li>
      </ul>

      <Card className="w-full max-w-md text-left">
        <CardHeader>
          <CardTitle>Capa de marca conectada</CardTitle>
          <CardDescription>
            Si el logo aparece arriba, el título usa Archivo con tracking de
            -0.25px y los swatches leen los tokens de marca, la capa de marca de
            Alta Vibración está aplicada sobre <code>@saas/ui</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Próximo (#21): app shell con TopBar + Footer reutilizando este logo.
        </CardContent>
      </Card>
    </main>
  );
}
