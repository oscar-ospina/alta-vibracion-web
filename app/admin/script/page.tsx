import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/sections/prose";
import { readAdminDoc } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Guion y plan de siete días",
  robots: { index: false, follow: false },
};

/**
 * Private operating docs (plan sections 3 and 10). Prerendered at build time
 * like the legal pages; proxy.ts still challenges the request before the
 * cached page is served.
 */
export default function AdminScriptPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
      <p className="text-sm">
        <Link href="/admin" className="text-brand-ink underline underline-offset-2">← Agenda</Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Guion de atención</h1>
      <div className="mt-6" data-testid="admin-script">
        <Prose gfm>{readAdminDoc("script")}</Prose>
      </div>
      <h2 className="mt-12 text-2xl font-bold text-foreground">Plan de siete días</h2>
      <div className="mt-4" data-testid="admin-week-plan">
        <Prose gfm>{readAdminDoc("week-plan")}</Prose>
      </div>
    </div>
  );
}
