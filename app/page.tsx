import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@saas/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Badge>Alta Vibración</Badge>

      <h1 className="font-display text-5xl font-bold tracking-tight text-foreground">
        Conecta con tu esencia a través de los números
      </h1>

      <p className="max-w-md text-lg text-muted-foreground">
        Scaffold inicial del sitio — <code>@saas/ui</code> + Tailwind v4 + Next.js
        App Router. <em>No es casualidad. Es vibración.</em>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button>Agenda tu cita</Button>
        <Button variant="outline">Conoce más</Button>
        <Button variant="link">Numerología</Button>
      </div>

      <Card className="w-full max-w-md text-left">
        <CardHeader>
          <CardTitle>Design system conectado</CardTitle>
          <CardDescription>
            Si el botón primario tiene relleno naranja con texto oscuro y los
            títulos usan Archivo, el theme de @saas/ui está aplicado.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Próximo (epic #16): hero + WhatsApp, secciones de confianza y la grilla
          de consultas.
        </CardContent>
      </Card>
    </main>
  );
}
