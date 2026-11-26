import { AdminNav } from "@/components/admin/admin-nav";

/** Shared frame for the private pages. No data reads: /admin/script is prerendered. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
