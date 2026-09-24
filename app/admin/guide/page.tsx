import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/sections/prose";
import { readAdminDoc } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Guía de operación",
  robots: { index: false, follow: false },
};

/**
 * The operating guide for Liliana (plan section 12, row 6): the five
 * operations, what she changes without code, exports, what to do on failure.
 * Markdown under content/admin/, prerendered at build time; the page itself
 * is challenged by proxy.ts like the rest of /admin.
 */
export default function AdminGuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
      <p className="text-sm">
        <Link href="/admin" className="text-brand-ink underline underline-offset-2">← Agenda</Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Guía de operación</h1>
      <div className="mt-6" data-testid="admin-guide">
        <Prose gfm>{readAdminDoc("operations")}</Prose>
      </div>
    </article>
  );
}
