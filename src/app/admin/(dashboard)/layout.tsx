import { requireAdmin } from "@/lib/supabase/require-admin";
import { AdminSidebarNav, AdminMobileNav } from "@/components/admin/admin-nav";
import { signOutAdmin } from "@/app/admin/actions";

export default async function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  const { admin } = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <AdminSidebarNav />

      <div className="flex-1">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
          <p className="min-w-0 truncate font-display text-base tracking-wide sm:text-lg">
            <span className="sm:hidden">CUSTOM DRIP ADMIN</span>
            <span className="hidden sm:inline">CUSTOM DRIP CHENNAI ADMIN</span>
          </p>
          <form action={signOutAdmin} className="flex flex-none items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {admin.full_name ?? admin.email}
            </span>
            <button
              type="submit"
              className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide underline underline-offset-4"
            >
              Sign Out
            </button>
          </form>
        </header>

        <main className="p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
      </div>

      <AdminMobileNav />
    </div>
  );
}
