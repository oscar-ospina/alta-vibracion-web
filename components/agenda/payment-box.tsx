import { KeyRound } from "lucide-react";
import type { PaymentInstructions } from "@/lib/payment";
import { formatCOP } from "@/lib/catalog";

/**
 * How to pay a pending booking: Bre-B key, amount and the booking code as
 * reference. Shown on the booking-created panel and on the status page while
 * the booking is pending. Without a configured key it explains the manual
 * path. Confirmation stays with Liliana: a transfer is never confirmed by a
 * screenshot (plan section 7).
 */
export function PaymentBox({
  instructions,
  amountCop,
  code,
}: {
  instructions: PaymentInstructions | null;
  amountCop: number;
  code: string;
}) {
  if (!instructions) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="payment-manual">
        Escríbele a Lili por WhatsApp con tu código: ella te envía los datos de pago y confirma
        la cita cuando verifique la transferencia.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm" data-testid="payment-box">
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <KeyRound className="size-4 text-violet-700" aria-hidden />
        Paga por Bre-B a esta llave
      </p>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Llave Bre-B</dt>
          <dd className="font-mono font-bold text-foreground" data-testid="breb-key">{instructions.brebKey}</dd>
        </div>
        {instructions.holderName && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">A nombre de</dt>
            <dd className="text-right">{instructions.holderName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Valor</dt>
          <dd className="font-semibold text-foreground">{formatCOP(amountCop)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Referencia</dt>
          <dd className="font-mono font-semibold text-foreground">{code}</dd>
        </div>
      </dl>
      <p className="mt-3 text-muted-foreground">
        Cuando pagues, envíale a Lili tu código por WhatsApp. Ella verifica el ingreso en la
        cuenta y confirma la cita; una captura de pantalla no confirma por sí sola.
      </p>
    </div>
  );
}
