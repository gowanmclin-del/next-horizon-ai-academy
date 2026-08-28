import { requireAdmin } from "@/lib/data/admin";
import AdminNav from "@/components/admin/AdminNav";

// Admin routes depend on the authenticated request and live Supabase data.
// Never attempt to prerender them during `next build`.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // This is the authorization boundary for every /admin route. It runs
  // server-side, before any admin page's markup is generated, and
  // redirects away (see lib/data/admin.ts) if the visitor isn't signed in
  // or isn't an admin. Nothing in this layout — or anything it renders —
  // depends on hiding a nav link; a non-admin literally never receives
  // this page's HTML.
  await requireAdmin();

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-horizon-cloud">
      <AdminNav />
      <div className="container-page py-8 sm:py-10">{children}</div>
    </div>
  );
}
