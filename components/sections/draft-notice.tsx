import { TriangleAlert } from "lucide-react";

/**
 * Draft banner shown atop the legal pages (story oscar-ospina/saas-planner#26).
 * The Términos / Privacidad copy is a BORRADOR pending legal review and still
 * carries `[POR CONFIRMAR: …]` placeholders — this makes that unmistakable so it
 * is never mistaken for final, binding text. Remove once the copy is validated.
 */
export function DraftNotice() {
  return (
    <aside
      role="note"
      className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm leading-relaxed text-violet-900"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-violet-700" aria-hidden />
      <p>
        <strong className="font-semibold">Borrador en revisión.</strong> Este texto
        es un borrador pendiente de validación legal y aún contiene datos por
        confirmar; no constituye asesoría jurídica ni un documento vinculante.
      </p>
    </aside>
  );
}
