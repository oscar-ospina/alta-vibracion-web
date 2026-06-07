import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@saas/ui";
import { whatsappUrl } from "@/lib/site";

/**
 * Home placeholder. The real hero + sections land in #23/#24/#25; this is just a
 * brand-correct stub rendered inside the shared app shell (TopBar + Footer).
 * No own <main> or full-height — the RootLayout owns the landmark and layout.
 */
export default function Home() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-20 text-center">
      <Badge>Alta Vibración</Badge>

      <h1 className="text-5xl font-bold text-foreground">
        Conecta con tu esencia a través de los números
      </h1>

      <p className="max-w-md text-lg text-muted-foreground">
        Numerología con Liliana Tobón. <em>No es casualidad. Es vibración.</em>
      </p>

      <Button size="lg" asChild>
        <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
          Agenda tu cita
        </a>
      </Button>

      <Card className="w-full max-w-md text-left">
        <CardHeader>
          <CardTitle>App shell activo</CardTitle>
          <CardDescription>
            Barra superior fija y pie de página compartidos en todas las rutas.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Próximo (#23): hero + FAB de WhatsApp, secciones de confianza y la
          grilla de consultas.
        </CardContent>
      </Card>
    </section>
  );
}
