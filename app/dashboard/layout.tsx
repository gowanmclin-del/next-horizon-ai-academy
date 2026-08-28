import RequireAuth from "@/components/dashboard/RequireAuth";
import DashboardNav from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-horizon-cloud lg:flex-row">
        <DashboardNav />
        <div className="flex-1 px-4 py-8 sm:px-8 sm:py-10 lg:px-12">{children}</div>
      </div>
    </RequireAuth>
  );
}
